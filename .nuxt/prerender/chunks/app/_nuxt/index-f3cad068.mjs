import { ssrRenderAttrs } from 'file://C:/Users/ASUS%20ROG/Documents/bigfivevue/node_modules/vue/server-renderer/index.mjs';
import { useSSRContext } from 'file://C:/Users/ASUS%20ROG/Documents/bigfivevue/node_modules/vue/index.mjs';

const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1>R\xE9alisations Page</h1></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/realisations/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-f3cad068.mjs.map
