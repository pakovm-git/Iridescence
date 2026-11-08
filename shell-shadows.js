import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import St from 'gi://St';

const EFFECT_NAME = 'iridescence-shadow';

const ShadowEffect = GObject.registerClass(class IridescenceShadowEffect extends Clutter.Effect {
    _init(masks) {
        super._init();
        this._masks = masks;
    }

    clear() {
        this._mask?.destroy();
        this._mask = this._texture = this._bounds = this._key = null;
    }

    vfunc_paint_node(node, context) {
        const actor = this.get_actor();
        try {
            const theme = actor.get_theme_node();
            const [found, shadow] = theme.lookup_shadow('-iridescence-shadow', false);
            const width = actor.width, height = actor.height;
            if (found && shadow?.color.alpha && theme.get_background_color().alpha && width && height) {
                const radii = [St.Corner.TOPLEFT, St.Corner.TOPRIGHT, St.Corner.BOTTOMRIGHT, St.Corner.BOTTOMLEFT]
                    .map(corner => theme.get_border_radius(corner));
                // St scales all corners together, then truncates to integer radii.
                const radiusScale = Math.fround(Math.min(1,
                    width / (radii[0] + radii[1] || 1), height / (radii[1] + radii[2] || 1),
                    width / (radii[2] + radii[3] || 1), height / (radii[3] + radii[0] || 1)));
                for (let i = 0; i < radii.length; i++) radii[i] = Math.floor(Math.fround(radii[i] * radiusScale));
                const scale = actor.get_resource_scale();
                const key = [width, height, scale, ...radii, shadow.xoffset, shadow.yoffset, shadow.blur, shadow.spread,
                    shadow.color.red, shadow.color.green, shadow.color.blue, shadow.color.alpha].join(',');
                if (key !== this._key) {
                    this.clear();
                    // An invisible, allocated mask lets St build its native shadow without snapshotting the control or its text.
                    this._mask = new Clutter.Actor({width, height, opacity: 0});
                    this._masks.add_child(this._mask);
                    this._mask.allocate(new Clutter.ActorBox({x1: 0, y1: 0, x2: width, y2: height}));
                    const pixelWidth = Math.ceil(width * scale), pixelHeight = Math.ceil(height * scale);
                    const bytes = new Uint8Array(pixelWidth * pixelHeight * 4).fill(255);
                    for (let corner = 0; corner < 4; corner++) {
                        const radius = radii[corner] * scale;
                        for (let y = 0; y < Math.ceil(radius); y++) for (let x = 0; x < Math.ceil(radius); x++) {
                            const alpha = Math.round(255 * Math.max(0, Math.min(1,
                                radius + 0.5 - Math.hypot(radius - x - 0.5, radius - y - 0.5))));
                            const px = corner === 1 || corner === 2 ? pixelWidth - x - 1 : x;
                            const py = corner >= 2 ? pixelHeight - y - 1 : y;
                            const index = (py * pixelWidth + px) * 4 + 3;
                            bytes[index] = Math.min(bytes[index], alpha);
                        }
                    }
                    const content = St.ImageContent.new_with_preferred_size(width, height);
                    content.set_data(actor.get_context().get_backend().get_cogl_context(), bytes,
                        Cogl.PixelFormat.RGBA_8888, pixelWidth, pixelHeight, pixelWidth * 4);
                    this._mask.content = content;
                    const helper = St.ShadowHelper.new(shadow);
                    helper.update(this._mask, context);
                    const padding = Math.ceil(shadow.blur + Math.abs(shadow.spread) + Math.max(Math.abs(shadow.xoffset), Math.abs(shadow.yoffset)));
                    const textureWidth = Math.ceil((width + 2 * padding) * scale);
                    const textureHeight = Math.ceil((height + 2 * padding) * scale);
                    const cogl = actor.get_context().get_backend().get_cogl_context();
                    this._texture = Cogl.Texture2D.new_with_size(cogl, textureWidth, textureHeight);
                    const framebuffer = Cogl.Offscreen.new_with_texture(this._texture);
                    framebuffer.allocate();
                    framebuffer.orthographic(0, 0, textureWidth / scale, textureHeight / scale, -1, 1);
                    const transparent = new Cogl.Color();
                    transparent.init_from_4f(0, 0, 0, 0);
                    const root = Clutter.RootNode.new(framebuffer, actor.get_color_state(), transparent, Cogl.BufferBit.COLOR);
                    helper.paint(root, new Clutter.ActorBox({x1: padding, y1: padding, x2: padding + width, y2: padding + height}), 255);
                    root.paint(context);
                    // Knock out the rounded caster once, so translucent fills never reveal the shadow beneath them.
                    const knockout = Cogl.Pipeline.new(cogl);
                    knockout.set_layer_texture(0, content.get_texture());
                    knockout.set_blend('RGBA = ADD (SRC_COLOR * (0), DST_COLOR * (1-SRC_COLOR[A]))');
                    framebuffer.draw_rectangle(knockout, padding, padding, padding + width, padding + height);
                    this._mask.destroy();
                    this._mask = null;
                    this._bounds = new Clutter.ActorBox({x1: -padding, y1: -padding,
                        x2: textureWidth / scale - padding, y2: textureHeight / scale - padding});
                    this._key = key;
                }
                const color = new Cogl.Color();
                const opacity = actor.get_paint_opacity() / 255;
                color.init_from_4f(1, 1, 1, opacity);
                const exterior = Clutter.TextureNode.new(this._texture, color, Clutter.ScalingFilter.LINEAR, Clutter.ScalingFilter.LINEAR);
                exterior.add_rectangle(this._bounds);
                node.add_child(exterior);
            }
        } finally {
            node.add_child(Clutter.ActorNode.new(actor, -1));
        }
    }

    vfunc_modify_paint_volume(volume) {
        const actor = this.get_actor();
        if (!actor?.get_stage()) return true;
        const [found, shadow] = actor.get_theme_node().lookup_shadow('-iridescence-shadow', false);
        if (found && shadow) {
            const origin = volume.get_origin();
            const left = Math.max(0, shadow.blur + shadow.spread - shadow.xoffset);
            const top = Math.max(0, shadow.blur + shadow.spread - shadow.yoffset);
            origin.x -= left; origin.y -= top;
            volume.set_origin(origin);
            volume.set_width(volume.get_width() + left + Math.max(0, shadow.blur + shadow.spread + shadow.xoffset));
            volume.set_height(volume.get_height() + top + Math.max(0, shadow.blur + shadow.spread + shadow.yoffset));
        }
        return true;
    }
});

export class ShellShadows {
    constructor(stage) {
        this._actors = new Map();
        this._masks = new Clutter.Actor({opacity: 0});
        stage.add_child(this._masks);
        try { this._watch(stage); } catch (error) { this.destroy(); throw error; }
    }

    _watch(actor) {
        if (actor === this._masks || this._actors.has(actor)) return;
        const record = {ids: [], effect: null, updating: false};
        this._actors.set(actor, record);
        record.ids.push(actor.connect('child-added', (_actor, child) => this._watch(child)));
        record.ids.push(actor.connect('destroy', () => this._forget(actor, true)));
        if (actor instanceof St.Widget) {
            record.ids.push(actor.connect('style-changed', () => this._refresh(actor, record)));
            this._refresh(actor, record);
        }
        for (const child of actor.get_children()) this._watch(child);
    }

    _refresh(actor, record) {
        if (record.updating || !actor.get_stage()) return;
        record.updating = true;
        try {
            const [found, shadow] = actor.get_theme_node().lookup_shadow('-iridescence-shadow', false);
            const visible = found && shadow?.color.alpha && actor.get_theme_node().get_background_color().alpha;
            if (visible && !record.effect) {
                record.effect = new ShadowEffect(this._masks);
                actor.add_effect_with_name(EFFECT_NAME, record.effect);
            } else if (!visible && record.effect) {
                record.effect.clear();
                actor.remove_effect(record.effect);
                record.effect._masks = null;
                record.effect = null;
            }
        } finally {
            record.updating = false;
        }
    }

    _forget(actor, destroying = false) {
        const record = this._actors.get(actor);
        if (!record) return;
        this._actors.delete(actor);
        for (const id of record.ids) actor.disconnect(id);
        record.effect?.clear();
        if (record.effect && !destroying) actor.remove_effect(record.effect);
        if (record.effect) record.effect._masks = null;
        record.effect = null;
    }

    destroy() {
        for (const actor of this._actors.keys()) this._forget(actor);
        this._masks.destroy();
        this._masks = null;
    }
}
