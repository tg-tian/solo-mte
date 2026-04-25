var Ta = Object.defineProperty;
var di = (e) => {
  throw TypeError(e);
};
var Sa = (e, t, u) => t in e ? Ta(e, t, { enumerable: !0, configurable: !0, writable: !0, value: u }) : e[t] = u;
var ie = (e, t, u) => Sa(e, typeof t != "symbol" ? t + "" : t, u), Gn = (e, t, u) => t.has(e) || di("Cannot " + u);
var m = (e, t, u) => (Gn(e, t, "read from private field"), u ? u.call(e) : t.get(e)), K = (e, t, u) => t.has(e) ? di("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, u), q = (e, t, u, r) => (Gn(e, t, "write to private field"), r ? r.call(e, u) : t.set(e, u), u), z = (e, t, u) => (Gn(e, t, "access private method"), u);
var Vu = (e, t, u, r) => ({
  set _(i) {
    q(e, t, i, u);
  },
  get _() {
    return m(e, t, r);
  }
});
import { defineComponent as Y, ref as V, createVNode as h, h as Fu, watch as ce, onMounted as _e, computed as N, onUnmounted as Or, Fragment as ut, unref as Cn, reactive as yo, toRef as Mr, mergeProps as Ln, shallowRef as Ru, nextTick as nt, resolveComponent as Bt, onBeforeUnmount as Bu, useId as La, provide as st, inject as te, createTextVNode as Ae } from "vue";
import { FPopover as Ia } from "@farris/ui-vue";
const Oa = {
  content: {
    type: Object,
    required: !0
  },
  onOpen: {
    type: Function,
    default: void 0
  }
}, Cu = /* @__PURE__ */ Y({
  name: "AppPreviewMessage",
  props: Oa,
  setup(e) {
    const t = V(!1);
    function u() {
      var d;
      const o = (d = e.content) == null ? void 0 : d.appConfig;
      if (!o) return "";
      const a = o.ws ?? "", s = o.appPath ?? "", c = o.appObjectId ?? "";
      return `${o.appBuilderUri ?? "/apps/platform/development-platform/ide/app-builder/index.html"}?path=${s}&boId=${c}&ws=${a}&version=2.0#/home`;
    }
    function r() {
      var a;
      const o = (a = e.content) == null ? void 0 : a.previewConfig;
      o && e.onOpen && e.onOpen(o);
    }
    function i(o) {
      const a = o.target;
      a != null && a.closest(".f-chat-app-preview-open-btn") || o.preventDefault();
    }
    function n(o) {
      o.stopPropagation();
      const a = u();
      a && window.open(a, "_blank");
    }
    return () => {
      const o = e.content;
      if (!o) return null;
      const {
        message: a,
        appName: s,
        createdDatetime: c
      } = o;
      return h("div", {
        class: "f-chat-message-app-preview"
      }, [h("div", {
        class: "f-chat-app-preview-message"
      }, [a]), h("div", {
        class: "f-chat-app-preview-card",
        onMouseenter: () => t.value = !0,
        onMouseleave: () => t.value = !1,
        onMousedown: i,
        onClick: r,
        role: "button",
        tabindex: 0,
        onKeydown: (f) => f.key === "Enter" && r()
      }, [h("div", {
        class: "f-chat-app-preview-card-left"
      }, [h("span", {
        class: "f-chat-app-preview-icon"
      }, [h("i", {
        class: "f-icon f-icon-page-title-administer"
      }, null)])]), h("div", {
        class: "f-chat-app-preview-card-middle"
      }, [h("div", {
        class: "f-chat-app-preview-app-name"
      }, [s]), h("div", {
        class: "f-chat-app-preview-datetime"
      }, [c])]), h("div", {
        class: "f-chat-app-preview-card-right"
      }, [h("div", {
        class: "f-chat-app-preview-action-area"
      }, null), t.value && h("button", {
        type: "button",
        class: "f-chat-app-preview-open-btn",
        onClick: n,
        title: "在新页签中打开",
        "aria-label": "在新页签中打开"
      }, [h("i", {
        class: "f-icon f-icon-folder-open"
      }, null)])])])]);
    };
  }
});
Cu.install = (e) => {
  e.component(Cu.name, Cu);
};
const Ma = {
  /** 气泡内容 */
  content: { type: Object, required: !0 },
  outputMode: { type: String, default: "streaming" },
  /** 自定义样式类名 */
  classNames: { type: Object, default: () => ({}) },
  /** 组件自定义样式类名 */
  customClass: { type: Object, default: "" },
  /** 组件自定义样式 */
  customStyle: { type: Object, default: "" },
  /** 气泡header类型 */
  header: { type: String, default: "sender" },
  /** 气泡位置 */
  placement: { type: String, default: "start" },
  /** 显示头像 */
  showAvatar: { type: Boolean, default: !0 },
  /** 自定义样式 */
  styles: { type: Object, default: () => ({}) },
  /** 附件列表 */
  attachments: { type: Array, default: () => [] },
  /** 消息内容包含思考过程时，用于注册更新思考过程的api */
  onLoadThink: { type: Function, default: void 0 },
  /** 消息内容包含思维链时，用于注册更新思维链内容的api */
  onLoadThoughtChain: { type: Function, default: void 0 },
  onPreview: { type: Function, default: void 0 },
  /** 气泡内 agent/request-run 等按钮确认 */
  onUserAuthConfirm: {
    type: Function,
    default: void 0
  },
  /** 复合消息：在正文区尾部追加渲染（单气泡内多块） */
  compositeTailRender: { type: Function, default: void 0 }
};
function De(e, t) {
  return t && (typeof t == "string" ? t.split(" ").filter(Boolean).forEach((r) => {
    e[r] = !0;
  }) : Array.isArray(t) ? t.forEach((u) => {
    u && (e[u] = !0);
  }) : typeof t == "object" && Object.entries(t).forEach(([u, r]) => {
    u && r && (e[u] = !0);
  })), e;
}
function Te(e, t) {
  return t && (typeof t == "string" ? t.split(";").filter(Boolean).forEach((r) => {
    var n, o;
    const i = r.split(":");
    if (i.length >= 2 && ((n = i[0]) != null && n.trim()) && ((o = i[1]) != null && o.trim())) {
      const a = i[0].trim(), s = i.slice(1).join(":").trim();
      e[a] = s;
    }
  }) : typeof t == "object" && Object.entries(t).forEach(([u, r]) => {
    u && r !== void 0 && r !== null && (e[u] = r);
  })), e;
}
function un(e) {
  return e || null;
}
function Ra(e) {
  return e ? /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(e) || e.startsWith("http") || e.startsWith("data:image") : !1;
}
function Rr(e) {
  return e ? typeof e != "string" ? e : Ra(e) ? Fu("img", {
    src: e,
    alt: "icon",
    class: "fx-prompt--item-icon-image",
    onError: (t) => {
      const u = t.target;
      u.style.display = "none", u.parentElement.innerHTML = '<i class="f-icon f-icon-warning"></i>';
    }
  }) : e.includes("f-icon") || e.includes("icon-") ? Fu("i", { class: e }) : e : null;
}
function Br(e, t, u, r = {}) {
  const { charInterval: i = 30 } = r, n = V({});
  let o = [], a = /* @__PURE__ */ new Set();
  const s = () => typeof t == "function" ? t() : t.value, c = () => typeof u == "function" ? u() : u.value, f = () => {
    o.forEach((p) => clearInterval(p)), o = [];
  }, l = () => {
    f(), n.value = {}, a.clear();
  }, d = () => {
    f(), n.value = {}, a.clear();
  }, g = () => {
    const p = e();
    if (!p || Object.keys(p).length === 0) {
      n.value = {};
      return;
    }
    if (!c()) {
      n.value = { ...p }, a = new Set(Object.keys(p));
      return;
    }
    const C = Object.keys(p);
    C.forEach((b) => {
      n.value.hasOwnProperty(b) || (n.value[b] = "");
    });
    const k = C.filter((b) => !a.has(b));
    if (k.length === 0)
      return;
    let w = 0;
    const v = () => {
      var D;
      if (w >= k.length)
        return;
      const b = k[w], A = p[b];
      if (!A) {
        a.add(b), w++, v();
        return;
      }
      let y = ((D = n.value[b]) == null ? void 0 : D.length) || 0;
      const E = setInterval(() => {
        y < A.length ? (n.value = {
          ...n.value,
          [b]: A.slice(0, y + 1)
        }, y++) : (clearInterval(E), o = o.filter((_) => _ !== E), a.add(b), w++, v());
      }, i);
      o.push(E);
    };
    v();
  };
  return ce(
    () => e(),
    () => {
      s() && g();
    },
    { immediate: !0 }
  ), ce(
    u,
    () => {
      d(), s() && g();
    }
  ), ce(
    t,
    (p) => {
      p ? g() : l();
    }
  ), _e(() => {
    s() && g();
  }), {
    displayContent: n
  };
}
function Ba(e, t) {
  const u = N(() => {
    var i;
    return Te({}, (i = e.styles) == null ? void 0 : i.header);
  });
  function r() {
    return t.slots.header && h("div", {
      class: `f-chat-bubble-header ${e.placement}`,
      style: u.value
    }, [t.slots.header()]);
  }
  return {
    renderHeader: r
  };
}
function za(e, t) {
  var n;
  const u = V(((n = e.content) == null ? void 0 : n.sender) ?? "发送人"), r = N(() => {
    var o;
    return Te({}, (o = e.styles) == null ? void 0 : o.header);
  });
  function i() {
    return h("div", {
      class: `f-chat-bubble-header ${e.placement}`,
      style: r.value
    }, [u.value]);
  }
  return {
    renderHeader: i
  };
}
function Na(e) {
  const { attachments: t } = e, u = N(() => !!t && t.length > 0), r = N(() => (t == null ? void 0 : t.length) ?? 0);
  return {
    hasAttachments: u,
    attachmentCount: r,
    getFileIcon: (a) => ({
      pdf: "file-type-pdf",
      doc: "file-type-doc",
      docx: "file-type-doc",
      xls: "file-type-xls",
      xlsx: "file-type-xls",
      ppt: "file-type-ppt",
      pptx: "file-type-ppt",
      txt: "file-type-txt",
      zip: "file-type-zip",
      rar: "file-type-zip",
      image: "file-type-img",
      img: "file-type-img",
      md: "file-type-md",
      video: "file-type-any",
      audio: "file-type-any"
    })[a.toLowerCase()] || "file-type-any",
    formatFileName: (a) => (a == null ? void 0 : a.replace(/\.[^.]+$/, "")) ?? "",
    formatFileSize: (a) => a < 1024 ? a + " B" : a < 1024 * 1024 ? (a / 1024).toFixed(1) + " KB" : (a / (1024 * 1024)).toFixed(1) + " MB"
  };
}
function Ao(e) {
  const {
    attachments: t,
    onItemClick: u
  } = e, {
    hasAttachments: r,
    getFileIcon: i,
    formatFileName: n,
    formatFileSize: o
  } = Na({
    attachments: t ?? []
  });
  function a() {
    return r.value ? h("div", {
      class: "f-chat-bubble-attachments"
    }, [t.map((s, c) => h("div", {
      class: "f-chat-bubble-attachment-item",
      key: c,
      onClick: () => u == null ? void 0 : u(s)
    }, [h("span", {
      class: `f-chat-bubble-attachment-icon ${i(s.type)}`
    }, null), h("div", {
      class: "f-chat-bubble-attachment-info"
    }, [h("span", {
      class: "f-chat-bubble-attachment-name"
    }, [n(s.name)]), h("span", {
      class: "f-chat-bubble-attachment-size"
    }, [o((s == null ? void 0 : s.size) ?? 0)])])]))]) : null;
  }
  return {
    renderAttachments: a,
    getFileIcon: i,
    formatFileSize: o
  };
}
const Pa = {
  /** 文件附件 */
  file: { type: Object, required: !0 },
  /** 组件自定义样式 */
  customStyle: { type: Object, default: () => ({}) },
  /** 文件项点击回调 */
  onItemClick: { type: Function, default: void 0 }
}, ja = /* @__PURE__ */ Y({
  name: "FXBubbleFileContentFooter",
  props: Pa,
  setup(e, t) {
    const {
      renderAttachments: u
    } = Ao({
      attachments: e.file ? [e.file] : [],
      onItemClick: e.onItemClick
    }), r = Te({}, e.customStyle);
    return () => h("div", {
      style: r
    }, [u()]);
  }
}), Ha = {
  /** 页面URL */
  pageUrl: { type: String, required: !0 },
  /** 组件自定义样式 */
  customStyle: { type: Object, default: () => ({}) },
  /** 导航事件回调 */
  onNavigate: { type: Function, default: void 0 }
}, $a = /* @__PURE__ */ Y({
  name: "FXBubblePageContentFooter",
  props: Ha,
  setup(e, t) {
    const u = V(), r = N(() => {
      var o, a;
      const n = {
        width: "100%",
        height: "100%",
        border: "none"
      };
      return (o = e.customStyle) != null && o.width && (n.width = e.customStyle.width), (a = e.customStyle) != null && a.height && (n.height = `${e.customStyle.height}px`), n;
    }), i = (n) => {
      var o, a;
      ((o = n.data) == null ? void 0 : o.type) === "navigation" && ((a = n.data) != null && a.url) && e.onNavigate && e.onNavigate(n.data.url);
    };
    return _e(() => {
      window.addEventListener("message", i);
    }), Or(() => {
      window.removeEventListener("message", i);
    }), () => h("iframe", {
      ref: u,
      src: e.pageUrl,
      style: r.value,
      scrolling: "auto"
    }, null);
  }
});
function Ua() {
  function e(i, n) {
    const { fileContent: o, height: a, width: s } = i;
    return {
      file: o,
      customStyle: {
        width: s || "100%",
        height: a || "100%"
      },
      onItemClick: n == null ? void 0 : n.onClickFile
    };
  }
  function t(i, n) {
    const { pageUrl: o, height: a, width: s } = i;
    return {
      pageUrl: o,
      customStyle: {
        width: s || "100%",
        height: a || "100%"
      },
      onNavigate: n == null ? void 0 : n.onNavigate
    };
  }
  function u(i, n) {
    const o = e(i, n);
    return Fu(ja, o);
  }
  function r(i, n) {
    const o = t(i, n);
    return Fu($a, o);
  }
  return {
    renderFileEmbeddedContent: u,
    renderPageEmbeddedContent: r
  };
}
const qa = {
  /** 标题 */
  title: { type: String, default: "" },
  /** 副标题 */
  subtitle: { type: String, default: "" },
  /** 正文 */
  text: { type: String, default: "" },
  /** 输出模式 */
  outputMode: { type: String, default: "streaming" }
}, Ga = /* @__PURE__ */ Y({
  name: "FXBubbleTextContent",
  props: qa,
  setup(e, t) {
    const u = N(() => e.outputMode === "streaming"), r = () => ({
      title: e.title,
      subtitle: e.subtitle,
      text: e.text
    }), {
      displayContent: i
    } = Br(r, () => !0, u, {
      charInterval: 30
    });
    return () => h(ut, null, [i.value.title && h("div", {
      class: "f-chat-bubble-content-title"
    }, [i.value.title]), i.value.subtitle && h("div", {
      class: "f-chat-bubble-content-subtitle"
    }, [i.value.subtitle]), i.value.text && h("div", {
      class: "f-chat-bubble-content-text"
    }, [i.value.text])]);
  }
}), Wa = {
  content: {
    type: Object
  },
  /** 输出模式 */
  outputMode: {
    type: String,
    default: "streaming"
  }
};
function Za(e) {
  const t = V(!0), u = V(null), r = V("pending"), i = V(null), n = () => {
    const s = Cn(e.content);
    if (!s) {
      r.value = "pending", u.value = null, i.value = null;
      return;
    }
    t.value = !0, u.value = {
      thinkingText: s.thinkingText ?? "思考中......",
      doneText: s.doneText ?? "思考完成",
      segments: s.segments ? [...s.segments] : []
    }, s.completed ? (r.value = "completed", i.value = null) : (r.value = "pending", i.value = Date.now());
  }, o = (s) => {
    !u.value || r.value === "completed" || (u.value = {
      ...u.value,
      segments: [...u.value.segments || [], ...s]
    });
  }, a = () => {
    if (!u.value) return;
    const c = `<span style="color: #999999">（用时${i.value ? Math.round((Date.now() - i.value) / 1e3) : 0}秒）</span>`;
    u.value = {
      ...u.value,
      doneText: `${u.value.doneText ?? "思考完成"} ${c}`
    }, r.value = "completed";
  };
  return ce(() => Cn(e.content), () => {
    n();
  }, { immediate: !0, deep: !0 }), yo({
    contentExpanded: t,
    localThinkContent: u,
    state: r,
    addSegments: o,
    completeThink: a
  });
}
const ko = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20width='18px'%20height='18px'%20viewBox='0%200%2018%2018'%20version='1.1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%3e%3ctitle%3e编组%207%3c/title%3e%3cdefs%3e%3clinearGradient%20x1='50%25'%20y1='0%25'%20x2='50%25'%20y2='100%25'%20id='linearGradient-1'%3e%3cstop%20stop-color='%230D7FE6'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%231EBBC6'%20offset='58.0673923%25'%3e%3c/stop%3e%3cstop%20stop-color='%232AE7AF'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cpath%20d='M7.55915932,0%20L13.7556941,3.41136535%20L13.7556941,11.284674%20L13.3483936,11.690778%20L7.386,8.406%20L7.38699821,14.9818613%20L6.43606745,14.9818613%20L0.817648054,11.8789694%20L0,10.332184%20L0,3.84230019%20L1.11160458,3.1505903%20L6.167,6.164%20L6.16702601,0.0484363034%20L7.55915932,0%20Z%20M6.22734637,8.44496623%20L1.7439756,11.0288454%20L6.22734637,13.5008368%20L6.22734637,8.44496623%20Z%20M12.540835,4.77769015%20L8.0314841,7.40118228%20L12.540835,9.89639007%20L12.540835,4.77769015%20Z%20M1.21847977,4.6422718%20L1.21847977,9.89639007%20L5.74466316,7.33704011%20L1.21847977,4.6422718%20Z%20M7.38699821,1.29872452%20L7.38699821,6.38587585%20L11.9618229,3.74647178%20L7.38699821,1.29872452%20Z'%20id='path-2'%3e%3c/path%3e%3clinearGradient%20x1='81.0966666%25'%20y1='38.5584607%25'%20x2='28.8545509%25'%20y2='61.9626707%25'%20id='linearGradient-4'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-5'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='44.8152906%25'%20y1='77.6521765%25'%20x2='44.8152906%25'%20y2='3.26462903%25'%20id='linearGradient-6'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-7'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='3.93796935%25'%20y1='32.607826%25'%20x2='78.9687461%25'%20y2='60.0462823%25'%20id='linearGradient-8'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-9'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='56.0769337%25'%20y1='45.0797149%25'%20x2='24.9463054%25'%20y2='71.1433818%25'%20id='linearGradient-10'%3e%3cstop%20stop-color='%23159BD7'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3clinearGradient%20x1='10.434388%25'%20y1='68.063656%25'%20x2='86.6988821%25'%20y2='30.8651063%25'%20id='linearGradient-11'%3e%3cstop%20stop-color='%2321C6C1'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3clinearGradient%20x1='50%25'%20y1='0%25'%20x2='50%25'%20y2='100%25'%20id='linearGradient-12'%3e%3cstop%20stop-color='%230D7FE6'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%232AE7AF'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3c/defs%3e%3cg%20id='页面-1'%20stroke='none'%20stroke-width='1'%20fill='none'%20fill-rule='evenodd'%3e%3cg%20id='输入框'%20transform='translate(-383,%20-2915)'%3e%3cg%20id='编组-3'%20transform='translate(353,%202900)'%3e%3cg%20id='编组-12'%20transform='translate(16,%200)'%3e%3cg%20id='编组-7'%20transform='translate(14,%2015)'%3e%3crect%20id='矩形'%20x='0'%20y='0'%20width='18'%20height='18'%3e%3c/rect%3e%3cg%20id='编组-35'%20transform='translate(0.2571,%200.2571)'%3e%3crect%20id='矩形'%20x='0'%20y='0'%20width='17.4857143'%20height='17.4857143'%3e%3c/rect%3e%3cg%20id='编组-19备份-17'%20transform='translate(1.0286,%200.5143)'%3e%3cpath%20d='M8.37444647,0.834547606%20L14.5709813,4.24591296%20L14.5709813,12.1192216%20L14.1636807,12.5253256%20L8.20128715,9.24054761%20L8.20228536,15.8164089%20L7.25135461,15.8164089%20L1.63293521,12.713517%20L0.815287151,11.1667316%20L0.815287151,4.67684779%20L1.92689173,3.98513791%20L6.98228715,6.99854761%20L6.98231316,0.882983909%20L8.37444647,0.834547606%20Z%20M7.04263352,9.27951383%20L2.55926275,11.8633931%20L7.04263352,14.3353844%20L7.04263352,9.27951383%20Z%20M13.3561221,5.61223775%20L8.84677126,8.23572989%20L13.3561221,10.7309377%20L13.3561221,5.61223775%20Z%20M2.03376692,5.47681941%20L2.03376692,10.7309377%20L6.55995031,8.17158771%20L2.03376692,5.47681941%20Z%20M8.20228536,2.13327213%20L8.20228536,7.22042346%20L12.77711,4.58101939%20L8.20228536,2.13327213%20Z'%20id='形状结合'%20fill='url(%23linearGradient-1)'%3e%3c/path%3e%3cg%20id='路径-2-+-路径-3-+-路径-4蒙版'%20transform='translate(0.8153,%200.8345)'%3e%3cmask%20id='mask-3'%20fill='white'%3e%3cuse%20xlink:href='%23path-2'%3e%3c/use%3e%3c/mask%3e%3cuse%20id='蒙版'%20fill='url(%23linearGradient-1)'%20xlink:href='%23path-2'%3e%3c/use%3e%3cpolygon%20id='路径-2'%20fill='url(%23linearGradient-4)'%20filter='url(%23filter-5)'%20mask='url(%23mask-3)'%20points='4.25315881%206.97898081%206.77390576%206.97898081%207.02656062%208.27871177%202.85827337%2011.0934106%201.11764364%208.72438079'%3e%3c/polygon%3e%3cpolygon%20id='路径-3'%20fill='url(%23linearGradient-6)'%20filter='url(%23filter-7)'%20mask='url(%23mask-3)'%20points='7.02656062%206.72375166%208.13485635%204.53274022%208.34127598%201.90699543%205.4451985%201.76583085%205.65253089%205.06118714%206.77390576%206.72375166'%3e%3c/polygon%3e%3cpolygon%20id='路径-4'%20fill='url(%23linearGradient-8)'%20filter='url(%23filter-9)'%20mask='url(%23mask-3)'%20points='10.0650382%207.40118228%207.32091739%207.49951705%207.32091739%208.25868082%208.54200343%2010.0061721%2010.9306691%2010.9000701%2012.5091187%208.51626021'%3e%3c/polygon%3e%3c/g%3e%3cpath%20d='M8.37444647,0.834547606%20L14.5709813,4.24591296%20L14.5709813,12.1192216%20L14.1636807,12.5253256%20L6.98231316,8.56885311%20L6.98231316,0.882983909%20L8.37444647,0.834547606%20Z%20M8.20228536,2.13327213%20L8.20228536,7.22042346%20L8.49131316,7.05254761%20L8.49185956,7.71336245%20L9.03131316,8.12754761%20L8.84677126,8.23572989%20L13.3561221,10.7309377%20L13.3553132,5.61654761%20L13.6305018,5.15381301%20L12.77711,4.58101939%20L8.20228536,2.13327213%20Z'%20id='形状结合'%20fill='url(%23linearGradient-10)'%20fill-rule='nonzero'%3e%3c/path%3e%3cpolygon%20id='路径'%20fill='url(%23linearGradient-11)'%20fill-rule='nonzero'%20points='6.7778308%208.05322127%207.08945008%209.24101764%202.55926275%2011.8633931%202.19155022%2010.6380421'%3e%3c/polygon%3e%3cg%20id='编组-21'%20fill='url(%23linearGradient-12)'%3e%3cpath%20d='M7.62936495,9.94195975%20C8.65711289,9.94195975%209.49026721,9.10880543%209.49026721,8.08105749%20C9.49026721,7.05330955%208.65711289,6.22015523%207.62936495,6.22015523%20C6.60161701,6.22015523%205.7684627,7.05330955%205.7684627,8.08105749%20C5.7684627,9.10880543%206.60161701,9.94195975%207.62936495,9.94195975%20Z%20M13.9785177,6.03107309%20C14.7793603,6.03107309%2015.4285714,5.38186193%2015.4285714,4.58101939%20C15.4285714,3.78017684%2014.7793603,3.13096568%2013.9785177,3.13096568%20C13.1776752,3.13096568%2012.528464,3.78017684%2012.528464,4.58101939%20C12.528464,5.38186193%2013.1776752,6.03107309%2013.9785177,6.03107309%20Z%20M7.62936495,16.4714598%20C8.4302075,16.4714598%209.07941866,15.8222486%209.07941866,15.0214061%20C9.07941866,14.2205635%208.4302075,13.5713524%207.62936495,13.5713524%20C6.8285224,13.5713524%206.17931125,14.2205635%206.17931125,15.0214061%20C6.17931125,15.8222486%206.8285224,16.4714598%207.62936495,16.4714598%20Z%20M1.45005371,13.0387617%20C2.25089625,13.0387617%202.90010741,12.3895505%202.90010741,11.588708%20C2.90010741,10.7878654%202.25089625,10.1386543%201.45005371,10.1386543%20C0.649211158,10.1386543%200,10.7878654%200,11.588708%20C0,12.3895505%200.649211158,13.0387617%201.45005371,13.0387617%20Z%20M7.62936495,2.51342642%20C8.32342849,2.51342642%208.88607816,1.95077675%208.88607816,1.25671321%20C8.88607816,0.56264967%208.32342849,0%207.62936495,0%20C6.93530141,0%206.37265174,0.56264967%206.37265174,1.25671321%20C6.37265174,1.95077675%206.93530141,2.51342642%207.62936495,2.51342642%20Z%20M13.9785177,12.9913309%20C14.6725813,12.9913309%2015.2352309,12.4286812%2015.2352309,11.7346177%20C15.2352309,11.0405541%2014.6725813,10.4779045%2013.9785177,10.4779045%20C13.2844542,10.4779045%2012.7218045,11.0405541%2012.7218045,11.7346177%20C12.7218045,12.4286812%2013.2844542,12.9913309%2013.9785177,12.9913309%20Z%20M1.45005371,5.50262617%20C2.14411725,5.50262617%202.70676692,4.9399765%202.70676692,4.24591296%20C2.70676692,3.55184942%202.14411725,2.98919975%201.45005371,2.98919975%20C0.755990164,2.98919975%200.193340494,3.55184942%200.193340494,4.24591296%20C0.193340494,4.9399765%200.755990164,5.50262617%201.45005371,5.50262617%20Z'%20id='形状结合'%3e%3c/path%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/svg%3e";
function zr({
  status: e
}) {
  const t = `f-chat-todo-status-icon f-chat-todo-status-${e.toLowerCase()}`;
  return h("span", {
    class: t,
    "aria-hidden": !0
  }, null);
}
const Va = /* @__PURE__ */ Y({
  name: "FXBubbleThink",
  props: Wa,
  emits: ["init"],
  setup(e, t) {
    const u = Za({
      content: Mr(e, "content")
    }), r = N(() => u.localThinkContent), i = N(() => ["f-chat-bubble-thinking", {
      "is-pending": u.state === "pending",
      "is-completed": u.state === "completed"
    }]), n = N(() => {
      var d;
      return !!((d = r.value) != null && d.segments && r.value.segments.length > 0);
    }), o = N(() => {
      var d, g;
      return u.state === "completed" ? ((d = r.value) == null ? void 0 : d.doneText) ?? "思考完成" : ((g = r.value) == null ? void 0 : g.thinkingText) ?? "思考中......";
    }), a = N(() => e.outputMode === "streaming"), s = () => {
      var p;
      const d = (p = r.value) == null ? void 0 : p.segments;
      if (!d) return {};
      const g = {};
      return d.forEach((C, k) => {
        C.title && (g[`seg${k}_title`] = C.title), g[`seg${k}_content`] = C.content;
      }), g;
    }, {
      displayContent: c
    } = Br(s, n, a, {
      charInterval: 30
    }), f = () => {
      u.contentExpanded = !u.contentExpanded;
    };
    _e(() => {
      r.value && t.emit("init", u);
    }), t.expose(u);
    const l = () => u.state === "pending" ? h(zr, {
      status: "Working"
    }, null) : u.state === "completed" ? h("img", {
      class: "f-chat-bubble-thinking-icon",
      src: ko,
      alt: "思考完成图标"
    }, null) : null;
    return () => r.value ? n.value ? h("div", {
      class: i.value
    }, [h("div", {
      class: "f-chat-bubble-thinking-header",
      onClick: f
    }, [l(), h("span", {
      class: "f-chat-bubble-thinking-status",
      innerHTML: o.value
    }, null), h("i", {
      class: `f-icon f-icon-arrow-chevron-${u.contentExpanded ? "down" : "right"}`
    }, null)]), u.contentExpanded && h("div", {
      class: "f-chat-bubble-thinking-content"
    }, [h("div", {
      class: "f-chat-bubble-thinking-timeline"
    }, [h("div", {
      class: "f-chat-bubble-thinking-dot"
    }, null), h("div", {
      class: "f-chat-bubble-thinking-line"
    }, null)]), h("div", {
      class: "f-chat-bubble-thinking-segments"
    }, [r.value.segments.map((d, g) => h("div", {
      key: g,
      class: "f-chat-bubble-thinking-segment"
    }, [d.title && h("div", {
      class: "f-chat-bubble-thinking-segment-title"
    }, [c.value[`seg${g}_title`] || ""]), h("div", {
      class: "f-chat-bubble-thinking-segment-text"
    }, [c.value[`seg${g}_content`] || ""])]))])])]) : h("span", {
      class: "f-chat-bubble-thinking-status-thinking"
    }, [r.value.thinkingText ?? "思考中......"]) : null;
  }
}), Xa = {
  content: {
    type: Object
  }
}, Nr = (e, t, u) => {
  if (!t) return e;
  const r = t.split(".").map(Number), i = [...e];
  let n = i;
  for (let o = 0; o < r.length; o++) {
    const a = r[o];
    if (!n[a]) return i;
    if (o === r.length - 1)
      n[a] = u(n[a]);
    else if (n[a].todoList) {
      const s = t.split(".").slice(o + 1).join(".");
      n[a] = {
        ...n[a],
        todoList: Nr(n[a].todoList, s, u)
      };
    }
  }
  return i;
}, Co = (e) => {
  var u;
  const t = (r) => {
    var i;
    return {
      ...r,
      status: "Done",
      todoList: (i = r.todoList) == null ? void 0 : i.map(t)
    };
  };
  return {
    ...e,
    status: "Done",
    todoList: (u = e.todoList) == null ? void 0 : u.map(t)
  };
}, Ya = (e, t) => Nr(e, t, Co), Qa = (e, t, u) => t ? Nr(e, t, (i) => ({
  ...i,
  todoList: [...i.todoList || [], ...u.map((n) => ({ ...n, status: "Working" }))]
})) : [...e, ...u.map((i) => ({ ...i, status: "Working" }))];
function Ka(e) {
  const t = V(null), u = V("NotStart"), r = V(null), i = () => {
    const c = Cn(e.content);
    if (!c) {
      t.value = null, u.value = "NotStart", r.value = null;
      return;
    }
    const f = (g) => g.map((p) => ({ ...p, status: "Working" })), l = c.preserveStatuses === !0, d = c.todoList.length > 0 ? l ? c.todoList.map((g) => ({ ...g })) : f(c.todoList) : [];
    t.value = {
      ...c,
      todoList: d,
      status: l ? c.status : "Working",
      message: c.message ?? "思考中......"
    }, u.value = l ? c.status : "Working", r.value = l ? null : Date.now();
  }, n = () => {
    if (!t.value) return;
    const f = `<span style="color: #999999">（用时${r.value ? Math.round((Date.now() - r.value) / 1e3) : 0}秒）</span>`, l = t.value.doneMessage ?? t.value.message;
    t.value = {
      ...t.value,
      status: "Done",
      todoList: t.value.todoList.map((d) => Co(d)),
      message: `${l} ${f}`
    }, u.value = "Done";
  }, o = (c) => {
    t.value && (t.value = {
      ...t.value,
      todoList: Ya([...t.value.todoList], c)
    });
  }, a = (c) => {
    if (!t.value) return;
    const f = c.map((l) => ({ ...l, status: "Working" }));
    t.value = {
      ...t.value,
      todoList: [...t.value.todoList, ...f]
    };
  }, s = (c, f) => {
    t.value && (t.value = {
      ...t.value,
      todoList: Qa([...t.value.todoList], c, f)
    });
  };
  return ce(() => Cn(e.content), () => {
    i();
  }, { immediate: !0, deep: !0 }), yo({
    localStartedTodo: t,
    thoughtChainState: u,
    setThoughtChainDone: n,
    setTodoWorkItemDone: o,
    addTodoWorkItems: a,
    addChildTodoWorkItems: s
  });
}
const Ja = {
  type: {
    type: String,
    default: "StartedToDo"
  },
  status: {
    type: String,
    default: "NotStart"
  },
  message: {
    type: String,
    default: ""
  },
  todoList: {
    type: Array,
    default: []
  },
  // 详细信息查看方式
  detailViewMode: {
    type: String,
    default: "hover"
  },
  initExpanded: {
    type: Boolean,
    default: !1
  },
  showLoading: {
    type: Boolean,
    default: !0
  },
  showLabel: {
    type: Boolean,
    default: !0
  },
  loading: Object,
  shimmer: {
    type: Boolean,
    default: !0
  }
}, es = {
  /** 待办事项列表 */
  items: {
    type: Array,
    default: () => []
  }
}, ts = {
  /** 索引 */
  id: {
    type: Number || String,
    default: 0
  },
  status: {
    type: String
  },
  task: {
    type: String,
    default: ""
  },
  todoList: {
    type: Array,
    default: []
  },
  detailViewMode: {
    type: String,
    default: "expand"
  },
  initExpanded: {
    type: Boolean,
    default: !0
  },
  showLoading: {
    type: Boolean,
    default: !0
  },
  showLabel: {
    type: Boolean,
    default: !1
  },
  shimmer: {
    type: Boolean,
    default: !0
  },
  title: {
    type: String,
    default: ""
  },
  /** 输出模式 */
  outputMode: {
    type: String,
    default: "streaming"
  }
}, pr = /* @__PURE__ */ Y({
  name: "FXTodoListItemView",
  props: ts,
  emits: ["click"],
  setup(e, {
    emit: t
  }) {
    const u = N(() => ["f-chat-todo-item", {
      "is-done": e.status === "Done",
      "is-working": e.status === "Working",
      "is-not-start": e.status === "NotStart",
      "no-shimmer": !e.shimmer
    }]);
    function r() {
      t("click", e, e.id);
    }
    const i = N(() => e.outputMode === "streaming"), n = () => ({
      title: e.title ?? "",
      task: e.task ?? ""
    }), {
      displayContent: o
    } = Br(n, () => !0, i, {
      charInterval: 30
    });
    return () => h("li", {
      key: e.id,
      class: u.value,
      onClick: r
    }, [e.todoList && e.todoList.length > 0 && h(Jt, {
      todoList: e.todoList,
      status: e.status,
      message: e.task,
      detailViewMode: e.detailViewMode,
      initExpanded: e.initExpanded,
      showLoading: e.showLoading,
      showLabel: e.showLabel
    }, null), !e.todoList || e.todoList.length === 0 && h(ut, null, [e.showLoading && h(zr, {
      status: e.status
    }, null), e.title ? h("div", {
      class: "f-chat-todo-task-wrapper"
    }, [h("span", {
      class: "f-chat-todo-task-title"
    }, [o.value.title]), h("div", {
      class: "f-chat-todo-task"
    }, [o.value.task])]) : h("div", {
      class: "f-chat-todo-task"
    }, [o.value.task])])]);
  }
}), _n = /* @__PURE__ */ Y({
  name: "FXTodoListView",
  props: es,
  setup(e) {
    return () => {
      var t;
      return (t = e.items) != null && t.length ? h("ul", {
        class: "f-chat-todo-items"
      }, [e.items.map((u, r) => h(pr, Ln({
        key: r
      }, u), null))]) : null;
    };
  }
}), us = 300, ns = {
  Working: "正在执行任务",
  Done: "已完成任务",
  NotStart: "待执行任务"
}, Jt = /* @__PURE__ */ Y({
  name: "FXStartedTodo",
  props: Ja,
  setup(e) {
    const t = V(null), u = V(null), r = V(null), i = V(null), n = V(e.initExpanded);
    function o() {
      e.detailViewMode !== "expand" && (i.value != null && (window.clearTimeout(i.value), i.value = null), r.value = window.setTimeout(() => {
        t.value && u.value && u.value.show(t.value), r.value = null;
      }, us));
    }
    function a() {
      e.detailViewMode !== "expand" && (r.value != null && (window.clearTimeout(r.value), r.value = null), i.value = window.setTimeout(() => {
        var g, p;
        (p = (g = u.value) == null ? void 0 : g.hide) == null || p.call(g), i.value = null;
      }, 150));
    }
    function s() {
      return e.detailViewMode !== "none" && h(_n, {
        items: e.todoList
      }, null);
    }
    function c() {
      e.detailViewMode === "expand" && (n.value = !n.value);
    }
    function f() {
      return e.detailViewMode === "expand" ? h("i", {
        class: "f-icon f-icon-arrow-chevron-right",
        style: {
          transform: n.value ? "rotate(90deg)" : "rotate(0deg)",
          transition: "all 0.3s ease-in-out"
        }
      }, null) : null;
    }
    function l() {
      return e.detailViewMode === "hover" && h(Ia, Ln({
        ref: u,
        class: "f-chat-started-todo-popover"
      }, {
        trigger: "none"
      }), {
        default: () => [h("div", {
          class: "f-chat-started-todo-popover-content",
          onMouseenter: () => {
            i.value != null && (window.clearTimeout(i.value), i.value = null);
          },
          onMouseleave: a
        }, [s()])]
      });
    }
    function d() {
      return e.showLoading ? e.loading ? e.loading : e.status === "Done" ? h("img", {
        src: ko
      }, null) : h(zr, {
        status: e.status
      }, null) : null;
    }
    return () => h("div", {
      ref: t,
      class: ["f-chat-message-started-todo", {
        "is-working": e.status === "Working"
      }],
      onMouseenter: o,
      onMouseleave: a
    }, [h("div", {
      class: "f-chat-message-started-todo--header",
      onClick: c
    }, [e.showLabel && h("span", {
      class: "f-chat-started-todo-label"
    }, [ns[e.status]]), d(), h("span", {
      class: "f-chat-started-todo-message",
      innerHTML: e.message
    }, null), f()]), e.detailViewMode === "expand" && n.value && h("div", {
      class: "f-chat-message-started-todo--content"
    }, [s()]), l()]);
  }
});
Jt.install = (e) => {
  e.component(Jt.name, Jt);
};
const rs = /* @__PURE__ */ Y({
  name: "FXBubbleThoughtChain",
  props: Xa,
  emits: ["init"],
  setup(e, t) {
    const u = Ka({
      content: Mr(e, "content")
    }), r = N(() => u.localStartedTodo);
    return _e(() => {
      u.localStartedTodo && t.emit("init", u);
    }), t.expose(u), () => {
      if (!r.value) return null;
      const i = r.value, {
        showHeaderStatusIcon: n,
        ...o
      } = i;
      return h(Jt, Ln(o, {
        showLabel: !1,
        initExpanded: !0,
        showLoading: n !== !1
      }), null);
    };
  }
}), hi = {};
function is(e) {
  let t = hi[e];
  if (t)
    return t;
  t = hi[e] = [];
  for (let u = 0; u < 128; u++) {
    const r = String.fromCharCode(u);
    t.push(r);
  }
  for (let u = 0; u < e.length; u++) {
    const r = e.charCodeAt(u);
    t[r] = "%" + ("0" + r.toString(16).toUpperCase()).slice(-2);
  }
  return t;
}
function au(e, t) {
  typeof t != "string" && (t = au.defaultChars);
  const u = is(t);
  return e.replace(/(%[a-f0-9]{2})+/gi, function(r) {
    let i = "";
    for (let n = 0, o = r.length; n < o; n += 3) {
      const a = parseInt(r.slice(n + 1, n + 3), 16);
      if (a < 128) {
        i += u[a];
        continue;
      }
      if ((a & 224) === 192 && n + 3 < o) {
        const s = parseInt(r.slice(n + 4, n + 6), 16);
        if ((s & 192) === 128) {
          const c = a << 6 & 1984 | s & 63;
          c < 128 ? i += "��" : i += String.fromCharCode(c), n += 3;
          continue;
        }
      }
      if ((a & 240) === 224 && n + 6 < o) {
        const s = parseInt(r.slice(n + 4, n + 6), 16), c = parseInt(r.slice(n + 7, n + 9), 16);
        if ((s & 192) === 128 && (c & 192) === 128) {
          const f = a << 12 & 61440 | s << 6 & 4032 | c & 63;
          f < 2048 || f >= 55296 && f <= 57343 ? i += "���" : i += String.fromCharCode(f), n += 6;
          continue;
        }
      }
      if ((a & 248) === 240 && n + 9 < o) {
        const s = parseInt(r.slice(n + 4, n + 6), 16), c = parseInt(r.slice(n + 7, n + 9), 16), f = parseInt(r.slice(n + 10, n + 12), 16);
        if ((s & 192) === 128 && (c & 192) === 128 && (f & 192) === 128) {
          let l = a << 18 & 1835008 | s << 12 & 258048 | c << 6 & 4032 | f & 63;
          l < 65536 || l > 1114111 ? i += "����" : (l -= 65536, i += String.fromCharCode(55296 + (l >> 10), 56320 + (l & 1023))), n += 9;
          continue;
        }
      }
      i += "�";
    }
    return i;
  });
}
au.defaultChars = ";/?:@&=+$,#";
au.componentChars = "";
const pi = {};
function os(e) {
  let t = pi[e];
  if (t)
    return t;
  t = pi[e] = [];
  for (let u = 0; u < 128; u++) {
    const r = String.fromCharCode(u);
    /^[0-9a-z]$/i.test(r) ? t.push(r) : t.push("%" + ("0" + u.toString(16).toUpperCase()).slice(-2));
  }
  for (let u = 0; u < e.length; u++)
    t[e.charCodeAt(u)] = e[u];
  return t;
}
function zu(e, t, u) {
  typeof t != "string" && (u = t, t = zu.defaultChars), typeof u > "u" && (u = !0);
  const r = os(t);
  let i = "";
  for (let n = 0, o = e.length; n < o; n++) {
    const a = e.charCodeAt(n);
    if (u && a === 37 && n + 2 < o && /^[0-9a-f]{2}$/i.test(e.slice(n + 1, n + 3))) {
      i += e.slice(n, n + 3), n += 2;
      continue;
    }
    if (a < 128) {
      i += r[a];
      continue;
    }
    if (a >= 55296 && a <= 57343) {
      if (a >= 55296 && a <= 56319 && n + 1 < o) {
        const s = e.charCodeAt(n + 1);
        if (s >= 56320 && s <= 57343) {
          i += encodeURIComponent(e[n] + e[n + 1]), n++;
          continue;
        }
      }
      i += "%EF%BF%BD";
      continue;
    }
    i += encodeURIComponent(e[n]);
  }
  return i;
}
zu.defaultChars = ";/?:@&=+$,-_.!~*'()#";
zu.componentChars = "-_.!~*'()";
function Pr(e) {
  let t = "";
  return t += e.protocol || "", t += e.slashes ? "//" : "", t += e.auth ? e.auth + "@" : "", e.hostname && e.hostname.indexOf(":") !== -1 ? t += "[" + e.hostname + "]" : t += e.hostname || "", t += e.port ? ":" + e.port : "", t += e.pathname || "", t += e.search || "", t += e.hash || "", t;
}
function wn() {
  this.protocol = null, this.slashes = null, this.auth = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.pathname = null;
}
const as = /^([a-z0-9.+-]+:)/i, ss = /:[0-9]*$/, ls = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, cs = ["<", ">", '"', "`", " ", "\r", `
`, "	"], fs = ["{", "}", "|", "\\", "^", "`"].concat(cs), ds = ["'"].concat(fs), mi = ["%", "/", "?", ";", "#"].concat(ds), gi = ["/", "?", "#"], hs = 255, bi = /^[+a-z0-9A-Z_-]{0,63}$/, ps = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, vi = {
  javascript: !0,
  "javascript:": !0
}, xi = {
  http: !0,
  https: !0,
  ftp: !0,
  gopher: !0,
  file: !0,
  "http:": !0,
  "https:": !0,
  "ftp:": !0,
  "gopher:": !0,
  "file:": !0
};
function jr(e, t) {
  if (e && e instanceof wn) return e;
  const u = new wn();
  return u.parse(e, t), u;
}
wn.prototype.parse = function(e, t) {
  let u, r, i, n = e;
  if (n = n.trim(), !t && e.split("#").length === 1) {
    const c = ls.exec(n);
    if (c)
      return this.pathname = c[1], c[2] && (this.search = c[2]), this;
  }
  let o = as.exec(n);
  if (o && (o = o[0], u = o.toLowerCase(), this.protocol = o, n = n.substr(o.length)), (t || o || n.match(/^\/\/[^@\/]+@[^@\/]+/)) && (i = n.substr(0, 2) === "//", i && !(o && vi[o]) && (n = n.substr(2), this.slashes = !0)), !vi[o] && (i || o && !xi[o])) {
    let c = -1;
    for (let p = 0; p < gi.length; p++)
      r = n.indexOf(gi[p]), r !== -1 && (c === -1 || r < c) && (c = r);
    let f, l;
    c === -1 ? l = n.lastIndexOf("@") : l = n.lastIndexOf("@", c), l !== -1 && (f = n.slice(0, l), n = n.slice(l + 1), this.auth = f), c = -1;
    for (let p = 0; p < mi.length; p++)
      r = n.indexOf(mi[p]), r !== -1 && (c === -1 || r < c) && (c = r);
    c === -1 && (c = n.length), n[c - 1] === ":" && c--;
    const d = n.slice(0, c);
    n = n.slice(c), this.parseHost(d), this.hostname = this.hostname || "";
    const g = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
    if (!g) {
      const p = this.hostname.split(/\./);
      for (let C = 0, k = p.length; C < k; C++) {
        const w = p[C];
        if (w && !w.match(bi)) {
          let v = "";
          for (let b = 0, A = w.length; b < A; b++)
            w.charCodeAt(b) > 127 ? v += "x" : v += w[b];
          if (!v.match(bi)) {
            const b = p.slice(0, C), A = p.slice(C + 1), y = w.match(ps);
            y && (b.push(y[1]), A.unshift(y[2])), A.length && (n = A.join(".") + n), this.hostname = b.join(".");
            break;
          }
        }
      }
    }
    this.hostname.length > hs && (this.hostname = ""), g && (this.hostname = this.hostname.substr(1, this.hostname.length - 2));
  }
  const a = n.indexOf("#");
  a !== -1 && (this.hash = n.substr(a), n = n.slice(0, a));
  const s = n.indexOf("?");
  return s !== -1 && (this.search = n.substr(s), n = n.slice(0, s)), n && (this.pathname = n), xi[u] && this.hostname && !this.pathname && (this.pathname = ""), this;
};
wn.prototype.parseHost = function(e) {
  let t = ss.exec(e);
  t && (t = t[0], t !== ":" && (this.port = t.substr(1)), e = e.substr(0, e.length - t.length)), e && (this.hostname = e);
};
const ms = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  decode: au,
  encode: zu,
  format: Pr,
  parse: jr
}, Symbol.toStringTag, { value: "Module" })), _o = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, wo = /[\0-\x1F\x7F-\x9F]/, gs = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/, Hr = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/, Eo = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/, Fo = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/, bs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Any: _o,
  Cc: wo,
  Cf: gs,
  P: Hr,
  S: Eo,
  Z: Fo
}, Symbol.toStringTag, { value: "Module" })), vs = new Uint16Array(
  // prettier-ignore
  'ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'.split("").map((e) => e.charCodeAt(0))
), xs = new Uint16Array(
  // prettier-ignore
  "Ȁaglq	\x1Bɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map((e) => e.charCodeAt(0))
);
var Wn;
const ys = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]), As = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, node/no-unsupported-features/es-builtins
  (Wn = String.fromCodePoint) !== null && Wn !== void 0 ? Wn : function(e) {
    let t = "";
    return e > 65535 && (e -= 65536, t += String.fromCharCode(e >>> 10 & 1023 | 55296), e = 56320 | e & 1023), t += String.fromCharCode(e), t;
  }
);
function ks(e) {
  var t;
  return e >= 55296 && e <= 57343 || e > 1114111 ? 65533 : (t = ys.get(e)) !== null && t !== void 0 ? t : e;
}
var xe;
(function(e) {
  e[e.NUM = 35] = "NUM", e[e.SEMI = 59] = "SEMI", e[e.EQUALS = 61] = "EQUALS", e[e.ZERO = 48] = "ZERO", e[e.NINE = 57] = "NINE", e[e.LOWER_A = 97] = "LOWER_A", e[e.LOWER_F = 102] = "LOWER_F", e[e.LOWER_X = 120] = "LOWER_X", e[e.LOWER_Z = 122] = "LOWER_Z", e[e.UPPER_A = 65] = "UPPER_A", e[e.UPPER_F = 70] = "UPPER_F", e[e.UPPER_Z = 90] = "UPPER_Z";
})(xe || (xe = {}));
const Cs = 32;
var St;
(function(e) {
  e[e.VALUE_LENGTH = 49152] = "VALUE_LENGTH", e[e.BRANCH_LENGTH = 16256] = "BRANCH_LENGTH", e[e.JUMP_TABLE = 127] = "JUMP_TABLE";
})(St || (St = {}));
function mr(e) {
  return e >= xe.ZERO && e <= xe.NINE;
}
function _s(e) {
  return e >= xe.UPPER_A && e <= xe.UPPER_F || e >= xe.LOWER_A && e <= xe.LOWER_F;
}
function ws(e) {
  return e >= xe.UPPER_A && e <= xe.UPPER_Z || e >= xe.LOWER_A && e <= xe.LOWER_Z || mr(e);
}
function Es(e) {
  return e === xe.EQUALS || ws(e);
}
var ge;
(function(e) {
  e[e.EntityStart = 0] = "EntityStart", e[e.NumericStart = 1] = "NumericStart", e[e.NumericDecimal = 2] = "NumericDecimal", e[e.NumericHex = 3] = "NumericHex", e[e.NamedEntity = 4] = "NamedEntity";
})(ge || (ge = {}));
var Dt;
(function(e) {
  e[e.Legacy = 0] = "Legacy", e[e.Strict = 1] = "Strict", e[e.Attribute = 2] = "Attribute";
})(Dt || (Dt = {}));
class Fs {
  constructor(t, u, r) {
    this.decodeTree = t, this.emitCodePoint = u, this.errors = r, this.state = ge.EntityStart, this.consumed = 1, this.result = 0, this.treeIndex = 0, this.excess = 1, this.decodeMode = Dt.Strict;
  }
  /** Resets the instance to make it reusable. */
  startEntity(t) {
    this.decodeMode = t, this.state = ge.EntityStart, this.result = 0, this.treeIndex = 0, this.excess = 1, this.consumed = 1;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param string The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(t, u) {
    switch (this.state) {
      case ge.EntityStart:
        return t.charCodeAt(u) === xe.NUM ? (this.state = ge.NumericStart, this.consumed += 1, this.stateNumericStart(t, u + 1)) : (this.state = ge.NamedEntity, this.stateNamedEntity(t, u));
      case ge.NumericStart:
        return this.stateNumericStart(t, u);
      case ge.NumericDecimal:
        return this.stateNumericDecimal(t, u);
      case ge.NumericHex:
        return this.stateNumericHex(t, u);
      case ge.NamedEntity:
        return this.stateNamedEntity(t, u);
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(t, u) {
    return u >= t.length ? -1 : (t.charCodeAt(u) | Cs) === xe.LOWER_X ? (this.state = ge.NumericHex, this.consumed += 1, this.stateNumericHex(t, u + 1)) : (this.state = ge.NumericDecimal, this.stateNumericDecimal(t, u));
  }
  addToNumericResult(t, u, r, i) {
    if (u !== r) {
      const n = r - u;
      this.result = this.result * Math.pow(i, n) + parseInt(t.substr(u, n), i), this.consumed += n;
    }
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(t, u) {
    const r = u;
    for (; u < t.length; ) {
      const i = t.charCodeAt(u);
      if (mr(i) || _s(i))
        u += 1;
      else
        return this.addToNumericResult(t, r, u, 16), this.emitNumericEntity(i, 3);
    }
    return this.addToNumericResult(t, r, u, 16), -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(t, u) {
    const r = u;
    for (; u < t.length; ) {
      const i = t.charCodeAt(u);
      if (mr(i))
        u += 1;
      else
        return this.addToNumericResult(t, r, u, 10), this.emitNumericEntity(i, 2);
    }
    return this.addToNumericResult(t, r, u, 10), -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(t, u) {
    var r;
    if (this.consumed <= u)
      return (r = this.errors) === null || r === void 0 || r.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
    if (t === xe.SEMI)
      this.consumed += 1;
    else if (this.decodeMode === Dt.Strict)
      return 0;
    return this.emitCodePoint(ks(this.result), this.consumed), this.errors && (t !== xe.SEMI && this.errors.missingSemicolonAfterCharacterReference(), this.errors.validateNumericCharacterReference(this.result)), this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(t, u) {
    const { decodeTree: r } = this;
    let i = r[this.treeIndex], n = (i & St.VALUE_LENGTH) >> 14;
    for (; u < t.length; u++, this.excess++) {
      const o = t.charCodeAt(u);
      if (this.treeIndex = Ds(r, i, this.treeIndex + Math.max(1, n), o), this.treeIndex < 0)
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === Dt.Attribute && // We shouldn't have consumed any characters after the entity,
        (n === 0 || // And there should be no invalid characters.
        Es(o)) ? 0 : this.emitNotTerminatedNamedEntity();
      if (i = r[this.treeIndex], n = (i & St.VALUE_LENGTH) >> 14, n !== 0) {
        if (o === xe.SEMI)
          return this.emitNamedEntityData(this.treeIndex, n, this.consumed + this.excess);
        this.decodeMode !== Dt.Strict && (this.result = this.treeIndex, this.consumed += this.excess, this.excess = 0);
      }
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var t;
    const { result: u, decodeTree: r } = this, i = (r[u] & St.VALUE_LENGTH) >> 14;
    return this.emitNamedEntityData(u, i, this.consumed), (t = this.errors) === null || t === void 0 || t.missingSemicolonAfterCharacterReference(), this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(t, u, r) {
    const { decodeTree: i } = this;
    return this.emitCodePoint(u === 1 ? i[t] & ~St.VALUE_LENGTH : i[t + 1], r), u === 3 && this.emitCodePoint(i[t + 2], r), r;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var t;
    switch (this.state) {
      case ge.NamedEntity:
        return this.result !== 0 && (this.decodeMode !== Dt.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      case ge.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case ge.NumericHex:
        return this.emitNumericEntity(0, 3);
      case ge.NumericStart:
        return (t = this.errors) === null || t === void 0 || t.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
      case ge.EntityStart:
        return 0;
    }
  }
}
function Do(e) {
  let t = "";
  const u = new Fs(e, (r) => t += As(r));
  return function(i, n) {
    let o = 0, a = 0;
    for (; (a = i.indexOf("&", a)) >= 0; ) {
      t += i.slice(o, a), u.startEntity(n);
      const c = u.write(
        i,
        // Skip the "&"
        a + 1
      );
      if (c < 0) {
        o = a + u.end();
        break;
      }
      o = a + c, a = c === 0 ? o + 1 : o;
    }
    const s = t + i.slice(o);
    return t = "", s;
  };
}
function Ds(e, t, u, r) {
  const i = (t & St.BRANCH_LENGTH) >> 7, n = t & St.JUMP_TABLE;
  if (i === 0)
    return n !== 0 && r === n ? u : -1;
  if (n) {
    const s = r - n;
    return s < 0 || s >= i ? -1 : e[u + s] - 1;
  }
  let o = u, a = o + i - 1;
  for (; o <= a; ) {
    const s = o + a >>> 1, c = e[s];
    if (c < r)
      o = s + 1;
    else if (c > r)
      a = s - 1;
    else
      return e[s + i];
  }
  return -1;
}
const Ts = Do(vs);
Do(xs);
function To(e, t = Dt.Legacy) {
  return Ts(e, t);
}
function Ss(e) {
  return Object.prototype.toString.call(e);
}
function $r(e) {
  return Ss(e) === "[object String]";
}
const Ls = Object.prototype.hasOwnProperty;
function Is(e, t) {
  return Ls.call(e, t);
}
function In(e) {
  return Array.prototype.slice.call(arguments, 1).forEach(function(u) {
    if (u) {
      if (typeof u != "object")
        throw new TypeError(u + "must be object");
      Object.keys(u).forEach(function(r) {
        e[r] = u[r];
      });
    }
  }), e;
}
function So(e, t, u) {
  return [].concat(e.slice(0, t), u, e.slice(t + 1));
}
function Ur(e) {
  return !(e >= 55296 && e <= 57343 || e >= 64976 && e <= 65007 || (e & 65535) === 65535 || (e & 65535) === 65534 || e >= 0 && e <= 8 || e === 11 || e >= 14 && e <= 31 || e >= 127 && e <= 159 || e > 1114111);
}
function En(e) {
  if (e > 65535) {
    e -= 65536;
    const t = 55296 + (e >> 10), u = 56320 + (e & 1023);
    return String.fromCharCode(t, u);
  }
  return String.fromCharCode(e);
}
const Lo = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, Os = /&([a-z#][a-z0-9]{1,31});/gi, Ms = new RegExp(Lo.source + "|" + Os.source, "gi"), Rs = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
function Bs(e, t) {
  if (t.charCodeAt(0) === 35 && Rs.test(t)) {
    const r = t[1].toLowerCase() === "x" ? parseInt(t.slice(2), 16) : parseInt(t.slice(1), 10);
    return Ur(r) ? En(r) : e;
  }
  const u = To(e);
  return u !== e ? u : e;
}
function zs(e) {
  return e.indexOf("\\") < 0 ? e : e.replace(Lo, "$1");
}
function su(e) {
  return e.indexOf("\\") < 0 && e.indexOf("&") < 0 ? e : e.replace(Ms, function(t, u, r) {
    return u || Bs(t, r);
  });
}
const Ns = /[&<>"]/, Ps = /[&<>"]/g, js = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function Hs(e) {
  return js[e];
}
function Ot(e) {
  return Ns.test(e) ? e.replace(Ps, Hs) : e;
}
const $s = /[.?*+^$[\]\\(){}|-]/g;
function Us(e) {
  return e.replace($s, "\\$&");
}
function re(e) {
  switch (e) {
    case 9:
    case 32:
      return !0;
  }
  return !1;
}
function Du(e) {
  if (e >= 8192 && e <= 8202)
    return !0;
  switch (e) {
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 32:
    case 160:
    case 5760:
    case 8239:
    case 8287:
    case 12288:
      return !0;
  }
  return !1;
}
function Tu(e) {
  return Hr.test(e) || Eo.test(e);
}
function Su(e) {
  switch (e) {
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
    case 58:
    case 59:
    case 60:
    case 61:
    case 62:
    case 63:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 124:
    case 125:
    case 126:
      return !0;
    default:
      return !1;
  }
}
function On(e) {
  return e = e.trim().replace(/\s+/g, " "), "ẞ".toLowerCase() === "Ṿ" && (e = e.replace(/ẞ/g, "ß")), e.toLowerCase().toUpperCase();
}
const qs = { mdurl: ms, ucmicro: bs }, Gs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  arrayReplaceAt: So,
  assign: In,
  escapeHtml: Ot,
  escapeRE: Us,
  fromCodePoint: En,
  has: Is,
  isMdAsciiPunct: Su,
  isPunctChar: Tu,
  isSpace: re,
  isString: $r,
  isValidEntityCode: Ur,
  isWhiteSpace: Du,
  lib: qs,
  normalizeReference: On,
  unescapeAll: su,
  unescapeMd: zs
}, Symbol.toStringTag, { value: "Module" }));
function Ws(e, t, u) {
  let r, i, n, o;
  const a = e.posMax, s = e.pos;
  for (e.pos = t + 1, r = 1; e.pos < a; ) {
    if (n = e.src.charCodeAt(e.pos), n === 93 && (r--, r === 0)) {
      i = !0;
      break;
    }
    if (o = e.pos, e.md.inline.skipToken(e), n === 91) {
      if (o === e.pos - 1)
        r++;
      else if (u)
        return e.pos = s, -1;
    }
  }
  let c = -1;
  return i && (c = e.pos), e.pos = s, c;
}
function Zs(e, t, u) {
  let r, i = t;
  const n = {
    ok: !1,
    pos: 0,
    str: ""
  };
  if (e.charCodeAt(i) === 60) {
    for (i++; i < u; ) {
      if (r = e.charCodeAt(i), r === 10 || r === 60)
        return n;
      if (r === 62)
        return n.pos = i + 1, n.str = su(e.slice(t + 1, i)), n.ok = !0, n;
      if (r === 92 && i + 1 < u) {
        i += 2;
        continue;
      }
      i++;
    }
    return n;
  }
  let o = 0;
  for (; i < u && (r = e.charCodeAt(i), !(r === 32 || r < 32 || r === 127)); ) {
    if (r === 92 && i + 1 < u) {
      if (e.charCodeAt(i + 1) === 32)
        break;
      i += 2;
      continue;
    }
    if (r === 40 && (o++, o > 32))
      return n;
    if (r === 41) {
      if (o === 0)
        break;
      o--;
    }
    i++;
  }
  return t === i || o !== 0 || (n.str = su(e.slice(t, i)), n.pos = i, n.ok = !0), n;
}
function Vs(e, t, u, r) {
  let i, n = t;
  const o = {
    // if `true`, this is a valid link title
    ok: !1,
    // if `true`, this link can be continued on the next line
    can_continue: !1,
    // if `ok`, it's the position of the first character after the closing marker
    pos: 0,
    // if `ok`, it's the unescaped title
    str: "",
    // expected closing marker character code
    marker: 0
  };
  if (r)
    o.str = r.str, o.marker = r.marker;
  else {
    if (n >= u)
      return o;
    let a = e.charCodeAt(n);
    if (a !== 34 && a !== 39 && a !== 40)
      return o;
    t++, n++, a === 40 && (a = 41), o.marker = a;
  }
  for (; n < u; ) {
    if (i = e.charCodeAt(n), i === o.marker)
      return o.pos = n + 1, o.str += su(e.slice(t, n)), o.ok = !0, o;
    if (i === 40 && o.marker === 41)
      return o;
    i === 92 && n + 1 < u && n++, n++;
  }
  return o.can_continue = !0, o.str += su(e.slice(t, n)), o;
}
const Xs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  parseLinkDestination: Zs,
  parseLinkLabel: Ws,
  parseLinkTitle: Vs
}, Symbol.toStringTag, { value: "Module" })), pt = {};
pt.code_inline = function(e, t, u, r, i) {
  const n = e[t];
  return "<code" + i.renderAttrs(n) + ">" + Ot(n.content) + "</code>";
};
pt.code_block = function(e, t, u, r, i) {
  const n = e[t];
  return "<pre" + i.renderAttrs(n) + "><code>" + Ot(e[t].content) + `</code></pre>
`;
};
pt.fence = function(e, t, u, r, i) {
  const n = e[t], o = n.info ? su(n.info).trim() : "";
  let a = "", s = "";
  if (o) {
    const f = o.split(/(\s+)/g);
    a = f[0], s = f.slice(2).join("");
  }
  let c;
  if (u.highlight ? c = u.highlight(n.content, a, s) || Ot(n.content) : c = Ot(n.content), c.indexOf("<pre") === 0)
    return c + `
`;
  if (o) {
    const f = n.attrIndex("class"), l = n.attrs ? n.attrs.slice() : [];
    f < 0 ? l.push(["class", u.langPrefix + a]) : (l[f] = l[f].slice(), l[f][1] += " " + u.langPrefix + a);
    const d = {
      attrs: l
    };
    return `<pre><code${i.renderAttrs(d)}>${c}</code></pre>
`;
  }
  return `<pre><code${i.renderAttrs(n)}>${c}</code></pre>
`;
};
pt.image = function(e, t, u, r, i) {
  const n = e[t];
  return n.attrs[n.attrIndex("alt")][1] = i.renderInlineAsText(n.children, u, r), i.renderToken(e, t, u);
};
pt.hardbreak = function(e, t, u) {
  return u.xhtmlOut ? `<br />
` : `<br>
`;
};
pt.softbreak = function(e, t, u) {
  return u.breaks ? u.xhtmlOut ? `<br />
` : `<br>
` : `
`;
};
pt.text = function(e, t) {
  return Ot(e[t].content);
};
pt.html_block = function(e, t) {
  return e[t].content;
};
pt.html_inline = function(e, t) {
  return e[t].content;
};
function lu() {
  this.rules = In({}, pt);
}
lu.prototype.renderAttrs = function(t) {
  let u, r, i;
  if (!t.attrs)
    return "";
  for (i = "", u = 0, r = t.attrs.length; u < r; u++)
    i += " " + Ot(t.attrs[u][0]) + '="' + Ot(t.attrs[u][1]) + '"';
  return i;
};
lu.prototype.renderToken = function(t, u, r) {
  const i = t[u];
  let n = "";
  if (i.hidden)
    return "";
  i.block && i.nesting !== -1 && u && t[u - 1].hidden && (n += `
`), n += (i.nesting === -1 ? "</" : "<") + i.tag, n += this.renderAttrs(i), i.nesting === 0 && r.xhtmlOut && (n += " /");
  let o = !1;
  if (i.block && (o = !0, i.nesting === 1 && u + 1 < t.length)) {
    const a = t[u + 1];
    (a.type === "inline" || a.hidden || a.nesting === -1 && a.tag === i.tag) && (o = !1);
  }
  return n += o ? `>
` : ">", n;
};
lu.prototype.renderInline = function(e, t, u) {
  let r = "";
  const i = this.rules;
  for (let n = 0, o = e.length; n < o; n++) {
    const a = e[n].type;
    typeof i[a] < "u" ? r += i[a](e, n, t, u, this) : r += this.renderToken(e, n, t);
  }
  return r;
};
lu.prototype.renderInlineAsText = function(e, t, u) {
  let r = "";
  for (let i = 0, n = e.length; i < n; i++)
    switch (e[i].type) {
      case "text":
        r += e[i].content;
        break;
      case "image":
        r += this.renderInlineAsText(e[i].children, t, u);
        break;
      case "html_inline":
      case "html_block":
        r += e[i].content;
        break;
      case "softbreak":
      case "hardbreak":
        r += `
`;
        break;
    }
  return r;
};
lu.prototype.render = function(e, t, u) {
  let r = "";
  const i = this.rules;
  for (let n = 0, o = e.length; n < o; n++) {
    const a = e[n].type;
    a === "inline" ? r += this.renderInline(e[n].children, t, u) : typeof i[a] < "u" ? r += i[a](e, n, t, u, this) : r += this.renderToken(e, n, t, u);
  }
  return r;
};
function Me() {
  this.__rules__ = [], this.__cache__ = null;
}
Me.prototype.__find__ = function(e) {
  for (let t = 0; t < this.__rules__.length; t++)
    if (this.__rules__[t].name === e)
      return t;
  return -1;
};
Me.prototype.__compile__ = function() {
  const e = this, t = [""];
  e.__rules__.forEach(function(u) {
    u.enabled && u.alt.forEach(function(r) {
      t.indexOf(r) < 0 && t.push(r);
    });
  }), e.__cache__ = {}, t.forEach(function(u) {
    e.__cache__[u] = [], e.__rules__.forEach(function(r) {
      r.enabled && (u && r.alt.indexOf(u) < 0 || e.__cache__[u].push(r.fn));
    });
  });
};
Me.prototype.at = function(e, t, u) {
  const r = this.__find__(e), i = u || {};
  if (r === -1)
    throw new Error("Parser rule not found: " + e);
  this.__rules__[r].fn = t, this.__rules__[r].alt = i.alt || [], this.__cache__ = null;
};
Me.prototype.before = function(e, t, u, r) {
  const i = this.__find__(e), n = r || {};
  if (i === -1)
    throw new Error("Parser rule not found: " + e);
  this.__rules__.splice(i, 0, {
    name: t,
    enabled: !0,
    fn: u,
    alt: n.alt || []
  }), this.__cache__ = null;
};
Me.prototype.after = function(e, t, u, r) {
  const i = this.__find__(e), n = r || {};
  if (i === -1)
    throw new Error("Parser rule not found: " + e);
  this.__rules__.splice(i + 1, 0, {
    name: t,
    enabled: !0,
    fn: u,
    alt: n.alt || []
  }), this.__cache__ = null;
};
Me.prototype.push = function(e, t, u) {
  const r = u || {};
  this.__rules__.push({
    name: e,
    enabled: !0,
    fn: t,
    alt: r.alt || []
  }), this.__cache__ = null;
};
Me.prototype.enable = function(e, t) {
  Array.isArray(e) || (e = [e]);
  const u = [];
  return e.forEach(function(r) {
    const i = this.__find__(r);
    if (i < 0) {
      if (t)
        return;
      throw new Error("Rules manager: invalid rule name " + r);
    }
    this.__rules__[i].enabled = !0, u.push(r);
  }, this), this.__cache__ = null, u;
};
Me.prototype.enableOnly = function(e, t) {
  Array.isArray(e) || (e = [e]), this.__rules__.forEach(function(u) {
    u.enabled = !1;
  }), this.enable(e, t);
};
Me.prototype.disable = function(e, t) {
  Array.isArray(e) || (e = [e]);
  const u = [];
  return e.forEach(function(r) {
    const i = this.__find__(r);
    if (i < 0) {
      if (t)
        return;
      throw new Error("Rules manager: invalid rule name " + r);
    }
    this.__rules__[i].enabled = !1, u.push(r);
  }, this), this.__cache__ = null, u;
};
Me.prototype.getRules = function(e) {
  return this.__cache__ === null && this.__compile__(), this.__cache__[e] || [];
};
function it(e, t, u) {
  this.type = e, this.tag = t, this.attrs = null, this.map = null, this.nesting = u, this.level = 0, this.children = null, this.content = "", this.markup = "", this.info = "", this.meta = null, this.block = !1, this.hidden = !1;
}
it.prototype.attrIndex = function(t) {
  if (!this.attrs)
    return -1;
  const u = this.attrs;
  for (let r = 0, i = u.length; r < i; r++)
    if (u[r][0] === t)
      return r;
  return -1;
};
it.prototype.attrPush = function(t) {
  this.attrs ? this.attrs.push(t) : this.attrs = [t];
};
it.prototype.attrSet = function(t, u) {
  const r = this.attrIndex(t), i = [t, u];
  r < 0 ? this.attrPush(i) : this.attrs[r] = i;
};
it.prototype.attrGet = function(t) {
  const u = this.attrIndex(t);
  let r = null;
  return u >= 0 && (r = this.attrs[u][1]), r;
};
it.prototype.attrJoin = function(t, u) {
  const r = this.attrIndex(t);
  r < 0 ? this.attrPush([t, u]) : this.attrs[r][1] = this.attrs[r][1] + " " + u;
};
function Io(e, t, u) {
  this.src = e, this.env = u, this.tokens = [], this.inlineMode = !1, this.md = t;
}
Io.prototype.Token = it;
const Ys = /\r\n?|\n/g, Qs = /\0/g;
function Ks(e) {
  let t;
  t = e.src.replace(Ys, `
`), t = t.replace(Qs, "�"), e.src = t;
}
function Js(e) {
  let t;
  e.inlineMode ? (t = new e.Token("inline", "", 0), t.content = e.src, t.map = [0, 1], t.children = [], e.tokens.push(t)) : e.md.block.parse(e.src, e.md, e.env, e.tokens);
}
function el(e) {
  const t = e.tokens;
  for (let u = 0, r = t.length; u < r; u++) {
    const i = t[u];
    i.type === "inline" && e.md.inline.parse(i.content, e.md, e.env, i.children);
  }
}
function tl(e) {
  return /^<a[>\s]/i.test(e);
}
function ul(e) {
  return /^<\/a\s*>/i.test(e);
}
function nl(e) {
  const t = e.tokens;
  if (e.md.options.linkify)
    for (let u = 0, r = t.length; u < r; u++) {
      if (t[u].type !== "inline" || !e.md.linkify.pretest(t[u].content))
        continue;
      let i = t[u].children, n = 0;
      for (let o = i.length - 1; o >= 0; o--) {
        const a = i[o];
        if (a.type === "link_close") {
          for (o--; i[o].level !== a.level && i[o].type !== "link_open"; )
            o--;
          continue;
        }
        if (a.type === "html_inline" && (tl(a.content) && n > 0 && n--, ul(a.content) && n++), !(n > 0) && a.type === "text" && e.md.linkify.test(a.content)) {
          const s = a.content;
          let c = e.md.linkify.match(s);
          const f = [];
          let l = a.level, d = 0;
          c.length > 0 && c[0].index === 0 && o > 0 && i[o - 1].type === "text_special" && (c = c.slice(1));
          for (let g = 0; g < c.length; g++) {
            const p = c[g].url, C = e.md.normalizeLink(p);
            if (!e.md.validateLink(C))
              continue;
            let k = c[g].text;
            c[g].schema ? c[g].schema === "mailto:" && !/^mailto:/i.test(k) ? k = e.md.normalizeLinkText("mailto:" + k).replace(/^mailto:/, "") : k = e.md.normalizeLinkText(k) : k = e.md.normalizeLinkText("http://" + k).replace(/^http:\/\//, "");
            const w = c[g].index;
            if (w > d) {
              const y = new e.Token("text", "", 0);
              y.content = s.slice(d, w), y.level = l, f.push(y);
            }
            const v = new e.Token("link_open", "a", 1);
            v.attrs = [["href", C]], v.level = l++, v.markup = "linkify", v.info = "auto", f.push(v);
            const b = new e.Token("text", "", 0);
            b.content = k, b.level = l, f.push(b);
            const A = new e.Token("link_close", "a", -1);
            A.level = --l, A.markup = "linkify", A.info = "auto", f.push(A), d = c[g].lastIndex;
          }
          if (d < s.length) {
            const g = new e.Token("text", "", 0);
            g.content = s.slice(d), g.level = l, f.push(g);
          }
          t[u].children = i = So(i, o, f);
        }
      }
    }
}
const Oo = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/, rl = /\((c|tm|r)\)/i, il = /\((c|tm|r)\)/ig, ol = {
  c: "©",
  r: "®",
  tm: "™"
};
function al(e, t) {
  return ol[t.toLowerCase()];
}
function sl(e) {
  let t = 0;
  for (let u = e.length - 1; u >= 0; u--) {
    const r = e[u];
    r.type === "text" && !t && (r.content = r.content.replace(il, al)), r.type === "link_open" && r.info === "auto" && t--, r.type === "link_close" && r.info === "auto" && t++;
  }
}
function ll(e) {
  let t = 0;
  for (let u = e.length - 1; u >= 0; u--) {
    const r = e[u];
    r.type === "text" && !t && Oo.test(r.content) && (r.content = r.content.replace(/\+-/g, "±").replace(/\.{2,}/g, "…").replace(/([?!])…/g, "$1..").replace(/([?!]){4,}/g, "$1$1$1").replace(/,{2,}/g, ",").replace(/(^|[^-])---(?=[^-]|$)/mg, "$1—").replace(/(^|\s)--(?=\s|$)/mg, "$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/mg, "$1–")), r.type === "link_open" && r.info === "auto" && t--, r.type === "link_close" && r.info === "auto" && t++;
  }
}
function cl(e) {
  let t;
  if (e.md.options.typographer)
    for (t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type === "inline" && (rl.test(e.tokens[t].content) && sl(e.tokens[t].children), Oo.test(e.tokens[t].content) && ll(e.tokens[t].children));
}
const fl = /['"]/, yi = /['"]/g, Ai = "’";
function Xu(e, t, u) {
  return e.slice(0, t) + u + e.slice(t + 1);
}
function dl(e, t) {
  let u;
  const r = [];
  for (let i = 0; i < e.length; i++) {
    const n = e[i], o = e[i].level;
    for (u = r.length - 1; u >= 0 && !(r[u].level <= o); u--)
      ;
    if (r.length = u + 1, n.type !== "text")
      continue;
    let a = n.content, s = 0, c = a.length;
    e:
      for (; s < c; ) {
        yi.lastIndex = s;
        const f = yi.exec(a);
        if (!f)
          break;
        let l = !0, d = !0;
        s = f.index + 1;
        const g = f[0] === "'";
        let p = 32;
        if (f.index - 1 >= 0)
          p = a.charCodeAt(f.index - 1);
        else
          for (u = i - 1; u >= 0 && !(e[u].type === "softbreak" || e[u].type === "hardbreak"); u--)
            if (e[u].content) {
              p = e[u].content.charCodeAt(e[u].content.length - 1);
              break;
            }
        let C = 32;
        if (s < c)
          C = a.charCodeAt(s);
        else
          for (u = i + 1; u < e.length && !(e[u].type === "softbreak" || e[u].type === "hardbreak"); u++)
            if (e[u].content) {
              C = e[u].content.charCodeAt(0);
              break;
            }
        const k = Su(p) || Tu(String.fromCharCode(p)), w = Su(C) || Tu(String.fromCharCode(C)), v = Du(p), b = Du(C);
        if (b ? l = !1 : w && (v || k || (l = !1)), v ? d = !1 : k && (b || w || (d = !1)), C === 34 && f[0] === '"' && p >= 48 && p <= 57 && (d = l = !1), l && d && (l = k, d = w), !l && !d) {
          g && (n.content = Xu(n.content, f.index, Ai));
          continue;
        }
        if (d)
          for (u = r.length - 1; u >= 0; u--) {
            let A = r[u];
            if (r[u].level < o)
              break;
            if (A.single === g && r[u].level === o) {
              A = r[u];
              let y, E;
              g ? (y = t.md.options.quotes[2], E = t.md.options.quotes[3]) : (y = t.md.options.quotes[0], E = t.md.options.quotes[1]), n.content = Xu(n.content, f.index, E), e[A.token].content = Xu(
                e[A.token].content,
                A.pos,
                y
              ), s += E.length - 1, A.token === i && (s += y.length - 1), a = n.content, c = a.length, r.length = u;
              continue e;
            }
          }
        l ? r.push({
          token: i,
          pos: f.index,
          single: g,
          level: o
        }) : d && g && (n.content = Xu(n.content, f.index, Ai));
      }
  }
}
function hl(e) {
  if (e.md.options.typographer)
    for (let t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type !== "inline" || !fl.test(e.tokens[t].content) || dl(e.tokens[t].children, e);
}
function pl(e) {
  let t, u;
  const r = e.tokens, i = r.length;
  for (let n = 0; n < i; n++) {
    if (r[n].type !== "inline") continue;
    const o = r[n].children, a = o.length;
    for (t = 0; t < a; t++)
      o[t].type === "text_special" && (o[t].type = "text");
    for (t = u = 0; t < a; t++)
      o[t].type === "text" && t + 1 < a && o[t + 1].type === "text" ? o[t + 1].content = o[t].content + o[t + 1].content : (t !== u && (o[u] = o[t]), u++);
    t !== u && (o.length = u);
  }
}
const Zn = [
  ["normalize", Ks],
  ["block", Js],
  ["inline", el],
  ["linkify", nl],
  ["replacements", cl],
  ["smartquotes", hl],
  // `text_join` finds `text_special` tokens (for escape sequences)
  // and joins them with the rest of the text
  ["text_join", pl]
];
function qr() {
  this.ruler = new Me();
  for (let e = 0; e < Zn.length; e++)
    this.ruler.push(Zn[e][0], Zn[e][1]);
}
qr.prototype.process = function(e) {
  const t = this.ruler.getRules("");
  for (let u = 0, r = t.length; u < r; u++)
    t[u](e);
};
qr.prototype.State = Io;
function mt(e, t, u, r) {
  this.src = e, this.md = t, this.env = u, this.tokens = r, this.bMarks = [], this.eMarks = [], this.tShift = [], this.sCount = [], this.bsCount = [], this.blkIndent = 0, this.line = 0, this.lineMax = 0, this.tight = !1, this.ddIndent = -1, this.listIndent = -1, this.parentType = "root", this.level = 0;
  const i = this.src;
  for (let n = 0, o = 0, a = 0, s = 0, c = i.length, f = !1; o < c; o++) {
    const l = i.charCodeAt(o);
    if (!f)
      if (re(l)) {
        a++, l === 9 ? s += 4 - s % 4 : s++;
        continue;
      } else
        f = !0;
    (l === 10 || o === c - 1) && (l !== 10 && o++, this.bMarks.push(n), this.eMarks.push(o), this.tShift.push(a), this.sCount.push(s), this.bsCount.push(0), f = !1, a = 0, s = 0, n = o + 1);
  }
  this.bMarks.push(i.length), this.eMarks.push(i.length), this.tShift.push(0), this.sCount.push(0), this.bsCount.push(0), this.lineMax = this.bMarks.length - 1;
}
mt.prototype.push = function(e, t, u) {
  const r = new it(e, t, u);
  return r.block = !0, u < 0 && this.level--, r.level = this.level, u > 0 && this.level++, this.tokens.push(r), r;
};
mt.prototype.isEmpty = function(t) {
  return this.bMarks[t] + this.tShift[t] >= this.eMarks[t];
};
mt.prototype.skipEmptyLines = function(t) {
  for (let u = this.lineMax; t < u && !(this.bMarks[t] + this.tShift[t] < this.eMarks[t]); t++)
    ;
  return t;
};
mt.prototype.skipSpaces = function(t) {
  for (let u = this.src.length; t < u; t++) {
    const r = this.src.charCodeAt(t);
    if (!re(r))
      break;
  }
  return t;
};
mt.prototype.skipSpacesBack = function(t, u) {
  if (t <= u)
    return t;
  for (; t > u; )
    if (!re(this.src.charCodeAt(--t)))
      return t + 1;
  return t;
};
mt.prototype.skipChars = function(t, u) {
  for (let r = this.src.length; t < r && this.src.charCodeAt(t) === u; t++)
    ;
  return t;
};
mt.prototype.skipCharsBack = function(t, u, r) {
  if (t <= r)
    return t;
  for (; t > r; )
    if (u !== this.src.charCodeAt(--t))
      return t + 1;
  return t;
};
mt.prototype.getLines = function(t, u, r, i) {
  if (t >= u)
    return "";
  const n = new Array(u - t);
  for (let o = 0, a = t; a < u; a++, o++) {
    let s = 0;
    const c = this.bMarks[a];
    let f = c, l;
    for (a + 1 < u || i ? l = this.eMarks[a] + 1 : l = this.eMarks[a]; f < l && s < r; ) {
      const d = this.src.charCodeAt(f);
      if (re(d))
        d === 9 ? s += 4 - (s + this.bsCount[a]) % 4 : s++;
      else if (f - c < this.tShift[a])
        s++;
      else
        break;
      f++;
    }
    s > r ? n[o] = new Array(s - r + 1).join(" ") + this.src.slice(f, l) : n[o] = this.src.slice(f, l);
  }
  return n.join("");
};
mt.prototype.Token = it;
const ml = 65536;
function Vn(e, t) {
  const u = e.bMarks[t] + e.tShift[t], r = e.eMarks[t];
  return e.src.slice(u, r);
}
function ki(e) {
  const t = [], u = e.length;
  let r = 0, i = e.charCodeAt(r), n = !1, o = 0, a = "";
  for (; r < u; )
    i === 124 && (n ? (a += e.substring(o, r - 1), o = r) : (t.push(a + e.substring(o, r)), a = "", o = r + 1)), n = i === 92, r++, i = e.charCodeAt(r);
  return t.push(a + e.substring(o)), t;
}
function gl(e, t, u, r) {
  if (t + 2 > u)
    return !1;
  let i = t + 1;
  if (e.sCount[i] < e.blkIndent || e.sCount[i] - e.blkIndent >= 4)
    return !1;
  let n = e.bMarks[i] + e.tShift[i];
  if (n >= e.eMarks[i])
    return !1;
  const o = e.src.charCodeAt(n++);
  if (o !== 124 && o !== 45 && o !== 58 || n >= e.eMarks[i])
    return !1;
  const a = e.src.charCodeAt(n++);
  if (a !== 124 && a !== 45 && a !== 58 && !re(a) || o === 45 && re(a))
    return !1;
  for (; n < e.eMarks[i]; ) {
    const A = e.src.charCodeAt(n);
    if (A !== 124 && A !== 45 && A !== 58 && !re(A))
      return !1;
    n++;
  }
  let s = Vn(e, t + 1), c = s.split("|");
  const f = [];
  for (let A = 0; A < c.length; A++) {
    const y = c[A].trim();
    if (!y) {
      if (A === 0 || A === c.length - 1)
        continue;
      return !1;
    }
    if (!/^:?-+:?$/.test(y))
      return !1;
    y.charCodeAt(y.length - 1) === 58 ? f.push(y.charCodeAt(0) === 58 ? "center" : "right") : y.charCodeAt(0) === 58 ? f.push("left") : f.push("");
  }
  if (s = Vn(e, t).trim(), s.indexOf("|") === -1 || e.sCount[t] - e.blkIndent >= 4)
    return !1;
  c = ki(s), c.length && c[0] === "" && c.shift(), c.length && c[c.length - 1] === "" && c.pop();
  const l = c.length;
  if (l === 0 || l !== f.length)
    return !1;
  if (r)
    return !0;
  const d = e.parentType;
  e.parentType = "table";
  const g = e.md.block.ruler.getRules("blockquote"), p = e.push("table_open", "table", 1), C = [t, 0];
  p.map = C;
  const k = e.push("thead_open", "thead", 1);
  k.map = [t, t + 1];
  const w = e.push("tr_open", "tr", 1);
  w.map = [t, t + 1];
  for (let A = 0; A < c.length; A++) {
    const y = e.push("th_open", "th", 1);
    f[A] && (y.attrs = [["style", "text-align:" + f[A]]]);
    const E = e.push("inline", "", 0);
    E.content = c[A].trim(), E.children = [], e.push("th_close", "th", -1);
  }
  e.push("tr_close", "tr", -1), e.push("thead_close", "thead", -1);
  let v, b = 0;
  for (i = t + 2; i < u && !(e.sCount[i] < e.blkIndent); i++) {
    let A = !1;
    for (let E = 0, D = g.length; E < D; E++)
      if (g[E](e, i, u, !0)) {
        A = !0;
        break;
      }
    if (A || (s = Vn(e, i).trim(), !s) || e.sCount[i] - e.blkIndent >= 4 || (c = ki(s), c.length && c[0] === "" && c.shift(), c.length && c[c.length - 1] === "" && c.pop(), b += l - c.length, b > ml))
      break;
    if (i === t + 2) {
      const E = e.push("tbody_open", "tbody", 1);
      E.map = v = [t + 2, 0];
    }
    const y = e.push("tr_open", "tr", 1);
    y.map = [i, i + 1];
    for (let E = 0; E < l; E++) {
      const D = e.push("td_open", "td", 1);
      f[E] && (D.attrs = [["style", "text-align:" + f[E]]]);
      const _ = e.push("inline", "", 0);
      _.content = c[E] ? c[E].trim() : "", _.children = [], e.push("td_close", "td", -1);
    }
    e.push("tr_close", "tr", -1);
  }
  return v && (e.push("tbody_close", "tbody", -1), v[1] = i), e.push("table_close", "table", -1), C[1] = i, e.parentType = d, e.line = i, !0;
}
function bl(e, t, u) {
  if (e.sCount[t] - e.blkIndent < 4)
    return !1;
  let r = t + 1, i = r;
  for (; r < u; ) {
    if (e.isEmpty(r)) {
      r++;
      continue;
    }
    if (e.sCount[r] - e.blkIndent >= 4) {
      r++, i = r;
      continue;
    }
    break;
  }
  e.line = i;
  const n = e.push("code_block", "code", 0);
  return n.content = e.getLines(t, i, 4 + e.blkIndent, !1) + `
`, n.map = [t, e.line], !0;
}
function vl(e, t, u, r) {
  let i = e.bMarks[t] + e.tShift[t], n = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4 || i + 3 > n)
    return !1;
  const o = e.src.charCodeAt(i);
  if (o !== 126 && o !== 96)
    return !1;
  let a = i;
  i = e.skipChars(i, o);
  let s = i - a;
  if (s < 3)
    return !1;
  const c = e.src.slice(a, i), f = e.src.slice(i, n);
  if (o === 96 && f.indexOf(String.fromCharCode(o)) >= 0)
    return !1;
  if (r)
    return !0;
  let l = t, d = !1;
  for (; l++, !(l >= u || (i = a = e.bMarks[l] + e.tShift[l], n = e.eMarks[l], i < n && e.sCount[l] < e.blkIndent)); )
    if (e.src.charCodeAt(i) === o && !(e.sCount[l] - e.blkIndent >= 4) && (i = e.skipChars(i, o), !(i - a < s) && (i = e.skipSpaces(i), !(i < n)))) {
      d = !0;
      break;
    }
  s = e.sCount[t], e.line = l + (d ? 1 : 0);
  const g = e.push("fence", "code", 0);
  return g.info = f, g.content = e.getLines(t + 1, l, s, !0), g.markup = c, g.map = [t, e.line], !0;
}
function xl(e, t, u, r) {
  let i = e.bMarks[t] + e.tShift[t], n = e.eMarks[t];
  const o = e.lineMax;
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 62)
    return !1;
  if (r)
    return !0;
  const a = [], s = [], c = [], f = [], l = e.md.block.ruler.getRules("blockquote"), d = e.parentType;
  e.parentType = "blockquote";
  let g = !1, p;
  for (p = t; p < u; p++) {
    const b = e.sCount[p] < e.blkIndent;
    if (i = e.bMarks[p] + e.tShift[p], n = e.eMarks[p], i >= n)
      break;
    if (e.src.charCodeAt(i++) === 62 && !b) {
      let y = e.sCount[p] + 1, E, D;
      e.src.charCodeAt(i) === 32 ? (i++, y++, D = !1, E = !0) : e.src.charCodeAt(i) === 9 ? (E = !0, (e.bsCount[p] + y) % 4 === 3 ? (i++, y++, D = !1) : D = !0) : E = !1;
      let _ = y;
      for (a.push(e.bMarks[p]), e.bMarks[p] = i; i < n; ) {
        const H = e.src.charCodeAt(i);
        if (re(H))
          H === 9 ? _ += 4 - (_ + e.bsCount[p] + (D ? 1 : 0)) % 4 : _++;
        else
          break;
        i++;
      }
      g = i >= n, s.push(e.bsCount[p]), e.bsCount[p] = e.sCount[p] + 1 + (E ? 1 : 0), c.push(e.sCount[p]), e.sCount[p] = _ - y, f.push(e.tShift[p]), e.tShift[p] = i - e.bMarks[p];
      continue;
    }
    if (g)
      break;
    let A = !1;
    for (let y = 0, E = l.length; y < E; y++)
      if (l[y](e, p, u, !0)) {
        A = !0;
        break;
      }
    if (A) {
      e.lineMax = p, e.blkIndent !== 0 && (a.push(e.bMarks[p]), s.push(e.bsCount[p]), f.push(e.tShift[p]), c.push(e.sCount[p]), e.sCount[p] -= e.blkIndent);
      break;
    }
    a.push(e.bMarks[p]), s.push(e.bsCount[p]), f.push(e.tShift[p]), c.push(e.sCount[p]), e.sCount[p] = -1;
  }
  const C = e.blkIndent;
  e.blkIndent = 0;
  const k = e.push("blockquote_open", "blockquote", 1);
  k.markup = ">";
  const w = [t, 0];
  k.map = w, e.md.block.tokenize(e, t, p);
  const v = e.push("blockquote_close", "blockquote", -1);
  v.markup = ">", e.lineMax = o, e.parentType = d, w[1] = e.line;
  for (let b = 0; b < f.length; b++)
    e.bMarks[b + t] = a[b], e.tShift[b + t] = f[b], e.sCount[b + t] = c[b], e.bsCount[b + t] = s[b];
  return e.blkIndent = C, !0;
}
function yl(e, t, u, r) {
  const i = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4)
    return !1;
  let n = e.bMarks[t] + e.tShift[t];
  const o = e.src.charCodeAt(n++);
  if (o !== 42 && o !== 45 && o !== 95)
    return !1;
  let a = 1;
  for (; n < i; ) {
    const c = e.src.charCodeAt(n++);
    if (c !== o && !re(c))
      return !1;
    c === o && a++;
  }
  if (a < 3)
    return !1;
  if (r)
    return !0;
  e.line = t + 1;
  const s = e.push("hr", "hr", 0);
  return s.map = [t, e.line], s.markup = Array(a + 1).join(String.fromCharCode(o)), !0;
}
function Ci(e, t) {
  const u = e.eMarks[t];
  let r = e.bMarks[t] + e.tShift[t];
  const i = e.src.charCodeAt(r++);
  if (i !== 42 && i !== 45 && i !== 43)
    return -1;
  if (r < u) {
    const n = e.src.charCodeAt(r);
    if (!re(n))
      return -1;
  }
  return r;
}
function _i(e, t) {
  const u = e.bMarks[t] + e.tShift[t], r = e.eMarks[t];
  let i = u;
  if (i + 1 >= r)
    return -1;
  let n = e.src.charCodeAt(i++);
  if (n < 48 || n > 57)
    return -1;
  for (; ; ) {
    if (i >= r)
      return -1;
    if (n = e.src.charCodeAt(i++), n >= 48 && n <= 57) {
      if (i - u >= 10)
        return -1;
      continue;
    }
    if (n === 41 || n === 46)
      break;
    return -1;
  }
  return i < r && (n = e.src.charCodeAt(i), !re(n)) ? -1 : i;
}
function Al(e, t) {
  const u = e.level + 2;
  for (let r = t + 2, i = e.tokens.length - 2; r < i; r++)
    e.tokens[r].level === u && e.tokens[r].type === "paragraph_open" && (e.tokens[r + 2].hidden = !0, e.tokens[r].hidden = !0, r += 2);
}
function kl(e, t, u, r) {
  let i, n, o, a, s = t, c = !0;
  if (e.sCount[s] - e.blkIndent >= 4 || e.listIndent >= 0 && e.sCount[s] - e.listIndent >= 4 && e.sCount[s] < e.blkIndent)
    return !1;
  let f = !1;
  r && e.parentType === "paragraph" && e.sCount[s] >= e.blkIndent && (f = !0);
  let l, d, g;
  if ((g = _i(e, s)) >= 0) {
    if (l = !0, o = e.bMarks[s] + e.tShift[s], d = Number(e.src.slice(o, g - 1)), f && d !== 1) return !1;
  } else if ((g = Ci(e, s)) >= 0)
    l = !1;
  else
    return !1;
  if (f && e.skipSpaces(g) >= e.eMarks[s])
    return !1;
  if (r)
    return !0;
  const p = e.src.charCodeAt(g - 1), C = e.tokens.length;
  l ? (a = e.push("ordered_list_open", "ol", 1), d !== 1 && (a.attrs = [["start", d]])) : a = e.push("bullet_list_open", "ul", 1);
  const k = [s, 0];
  a.map = k, a.markup = String.fromCharCode(p);
  let w = !1;
  const v = e.md.block.ruler.getRules("list"), b = e.parentType;
  for (e.parentType = "list"; s < u; ) {
    n = g, i = e.eMarks[s];
    const A = e.sCount[s] + g - (e.bMarks[s] + e.tShift[s]);
    let y = A;
    for (; n < i; ) {
      const M = e.src.charCodeAt(n);
      if (M === 9)
        y += 4 - (y + e.bsCount[s]) % 4;
      else if (M === 32)
        y++;
      else
        break;
      n++;
    }
    const E = n;
    let D;
    E >= i ? D = 1 : D = y - A, D > 4 && (D = 1);
    const _ = A + D;
    a = e.push("list_item_open", "li", 1), a.markup = String.fromCharCode(p);
    const H = [s, 0];
    a.map = H, l && (a.info = e.src.slice(o, g - 1));
    const G = e.tight, P = e.tShift[s], F = e.sCount[s], L = e.listIndent;
    if (e.listIndent = e.blkIndent, e.blkIndent = _, e.tight = !0, e.tShift[s] = E - e.bMarks[s], e.sCount[s] = y, E >= i && e.isEmpty(s + 1) ? e.line = Math.min(e.line + 2, u) : e.md.block.tokenize(e, s, u, !0), (!e.tight || w) && (c = !1), w = e.line - s > 1 && e.isEmpty(e.line - 1), e.blkIndent = e.listIndent, e.listIndent = L, e.tShift[s] = P, e.sCount[s] = F, e.tight = G, a = e.push("list_item_close", "li", -1), a.markup = String.fromCharCode(p), s = e.line, H[1] = s, s >= u || e.sCount[s] < e.blkIndent || e.sCount[s] - e.blkIndent >= 4)
      break;
    let B = !1;
    for (let M = 0, T = v.length; M < T; M++)
      if (v[M](e, s, u, !0)) {
        B = !0;
        break;
      }
    if (B)
      break;
    if (l) {
      if (g = _i(e, s), g < 0)
        break;
      o = e.bMarks[s] + e.tShift[s];
    } else if (g = Ci(e, s), g < 0)
      break;
    if (p !== e.src.charCodeAt(g - 1))
      break;
  }
  return l ? a = e.push("ordered_list_close", "ol", -1) : a = e.push("bullet_list_close", "ul", -1), a.markup = String.fromCharCode(p), k[1] = s, e.line = s, e.parentType = b, c && Al(e, C), !0;
}
function Cl(e, t, u, r) {
  let i = e.bMarks[t] + e.tShift[t], n = e.eMarks[t], o = t + 1;
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 91)
    return !1;
  function a(v) {
    const b = e.lineMax;
    if (v >= b || e.isEmpty(v))
      return null;
    let A = !1;
    if (e.sCount[v] - e.blkIndent > 3 && (A = !0), e.sCount[v] < 0 && (A = !0), !A) {
      const D = e.md.block.ruler.getRules("reference"), _ = e.parentType;
      e.parentType = "reference";
      let H = !1;
      for (let G = 0, P = D.length; G < P; G++)
        if (D[G](e, v, b, !0)) {
          H = !0;
          break;
        }
      if (e.parentType = _, H)
        return null;
    }
    const y = e.bMarks[v] + e.tShift[v], E = e.eMarks[v];
    return e.src.slice(y, E + 1);
  }
  let s = e.src.slice(i, n + 1);
  n = s.length;
  let c = -1;
  for (i = 1; i < n; i++) {
    const v = s.charCodeAt(i);
    if (v === 91)
      return !1;
    if (v === 93) {
      c = i;
      break;
    } else if (v === 10) {
      const b = a(o);
      b !== null && (s += b, n = s.length, o++);
    } else if (v === 92 && (i++, i < n && s.charCodeAt(i) === 10)) {
      const b = a(o);
      b !== null && (s += b, n = s.length, o++);
    }
  }
  if (c < 0 || s.charCodeAt(c + 1) !== 58)
    return !1;
  for (i = c + 2; i < n; i++) {
    const v = s.charCodeAt(i);
    if (v === 10) {
      const b = a(o);
      b !== null && (s += b, n = s.length, o++);
    } else if (!re(v)) break;
  }
  const f = e.md.helpers.parseLinkDestination(s, i, n);
  if (!f.ok)
    return !1;
  const l = e.md.normalizeLink(f.str);
  if (!e.md.validateLink(l))
    return !1;
  i = f.pos;
  const d = i, g = o, p = i;
  for (; i < n; i++) {
    const v = s.charCodeAt(i);
    if (v === 10) {
      const b = a(o);
      b !== null && (s += b, n = s.length, o++);
    } else if (!re(v)) break;
  }
  let C = e.md.helpers.parseLinkTitle(s, i, n);
  for (; C.can_continue; ) {
    const v = a(o);
    if (v === null) break;
    s += v, i = n, n = s.length, o++, C = e.md.helpers.parseLinkTitle(s, i, n, C);
  }
  let k;
  for (i < n && p !== i && C.ok ? (k = C.str, i = C.pos) : (k = "", i = d, o = g); i < n; ) {
    const v = s.charCodeAt(i);
    if (!re(v))
      break;
    i++;
  }
  if (i < n && s.charCodeAt(i) !== 10 && k)
    for (k = "", i = d, o = g; i < n; ) {
      const v = s.charCodeAt(i);
      if (!re(v))
        break;
      i++;
    }
  if (i < n && s.charCodeAt(i) !== 10)
    return !1;
  const w = On(s.slice(1, c));
  return w ? (r || (typeof e.env.references > "u" && (e.env.references = {}), typeof e.env.references[w] > "u" && (e.env.references[w] = { title: k, href: l }), e.line = o), !0) : !1;
}
const _l = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
], wl = "[a-zA-Z_:][a-zA-Z0-9:._-]*", El = "[^\"'=<>`\\x00-\\x20]+", Fl = "'[^']*'", Dl = '"[^"]*"', Tl = "(?:" + El + "|" + Fl + "|" + Dl + ")", Sl = "(?:\\s+" + wl + "(?:\\s*=\\s*" + Tl + ")?)", Mo = "<[A-Za-z][A-Za-z0-9\\-]*" + Sl + "*\\s*\\/?>", Ro = "<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>", Ll = "<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->", Il = "<[?][\\s\\S]*?[?]>", Ol = "<![A-Za-z][^>]*>", Ml = "<!\\[CDATA\\[[\\s\\S]*?\\]\\]>", Rl = new RegExp("^(?:" + Mo + "|" + Ro + "|" + Ll + "|" + Il + "|" + Ol + "|" + Ml + ")"), Bl = new RegExp("^(?:" + Mo + "|" + Ro + ")"), Yt = [
  [/^<(script|pre|style|textarea)(?=(\s|>|$))/i, /<\/(script|pre|style|textarea)>/i, !0],
  [/^<!--/, /-->/, !0],
  [/^<\?/, /\?>/, !0],
  [/^<![A-Z]/, />/, !0],
  [/^<!\[CDATA\[/, /\]\]>/, !0],
  [new RegExp("^</?(" + _l.join("|") + ")(?=(\\s|/?>|$))", "i"), /^$/, !0],
  [new RegExp(Bl.source + "\\s*$"), /^$/, !1]
];
function zl(e, t, u, r) {
  let i = e.bMarks[t] + e.tShift[t], n = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4 || !e.md.options.html || e.src.charCodeAt(i) !== 60)
    return !1;
  let o = e.src.slice(i, n), a = 0;
  for (; a < Yt.length && !Yt[a][0].test(o); a++)
    ;
  if (a === Yt.length)
    return !1;
  if (r)
    return Yt[a][2];
  let s = t + 1;
  if (!Yt[a][1].test(o)) {
    for (; s < u && !(e.sCount[s] < e.blkIndent); s++)
      if (i = e.bMarks[s] + e.tShift[s], n = e.eMarks[s], o = e.src.slice(i, n), Yt[a][1].test(o)) {
        o.length !== 0 && s++;
        break;
      }
  }
  e.line = s;
  const c = e.push("html_block", "", 0);
  return c.map = [t, s], c.content = e.getLines(t, s, e.blkIndent, !0), !0;
}
function Nl(e, t, u, r) {
  let i = e.bMarks[t] + e.tShift[t], n = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4)
    return !1;
  let o = e.src.charCodeAt(i);
  if (o !== 35 || i >= n)
    return !1;
  let a = 1;
  for (o = e.src.charCodeAt(++i); o === 35 && i < n && a <= 6; )
    a++, o = e.src.charCodeAt(++i);
  if (a > 6 || i < n && !re(o))
    return !1;
  if (r)
    return !0;
  n = e.skipSpacesBack(n, i);
  const s = e.skipCharsBack(n, 35, i);
  s > i && re(e.src.charCodeAt(s - 1)) && (n = s), e.line = t + 1;
  const c = e.push("heading_open", "h" + String(a), 1);
  c.markup = "########".slice(0, a), c.map = [t, e.line];
  const f = e.push("inline", "", 0);
  f.content = e.src.slice(i, n).trim(), f.map = [t, e.line], f.children = [];
  const l = e.push("heading_close", "h" + String(a), -1);
  return l.markup = "########".slice(0, a), !0;
}
function Pl(e, t, u) {
  const r = e.md.block.ruler.getRules("paragraph");
  if (e.sCount[t] - e.blkIndent >= 4)
    return !1;
  const i = e.parentType;
  e.parentType = "paragraph";
  let n = 0, o, a = t + 1;
  for (; a < u && !e.isEmpty(a); a++) {
    if (e.sCount[a] - e.blkIndent > 3)
      continue;
    if (e.sCount[a] >= e.blkIndent) {
      let g = e.bMarks[a] + e.tShift[a];
      const p = e.eMarks[a];
      if (g < p && (o = e.src.charCodeAt(g), (o === 45 || o === 61) && (g = e.skipChars(g, o), g = e.skipSpaces(g), g >= p))) {
        n = o === 61 ? 1 : 2;
        break;
      }
    }
    if (e.sCount[a] < 0)
      continue;
    let d = !1;
    for (let g = 0, p = r.length; g < p; g++)
      if (r[g](e, a, u, !0)) {
        d = !0;
        break;
      }
    if (d)
      break;
  }
  if (!n)
    return !1;
  const s = e.getLines(t, a, e.blkIndent, !1).trim();
  e.line = a + 1;
  const c = e.push("heading_open", "h" + String(n), 1);
  c.markup = String.fromCharCode(o), c.map = [t, e.line];
  const f = e.push("inline", "", 0);
  f.content = s, f.map = [t, e.line - 1], f.children = [];
  const l = e.push("heading_close", "h" + String(n), -1);
  return l.markup = String.fromCharCode(o), e.parentType = i, !0;
}
function jl(e, t, u) {
  const r = e.md.block.ruler.getRules("paragraph"), i = e.parentType;
  let n = t + 1;
  for (e.parentType = "paragraph"; n < u && !e.isEmpty(n); n++) {
    if (e.sCount[n] - e.blkIndent > 3 || e.sCount[n] < 0)
      continue;
    let c = !1;
    for (let f = 0, l = r.length; f < l; f++)
      if (r[f](e, n, u, !0)) {
        c = !0;
        break;
      }
    if (c)
      break;
  }
  const o = e.getLines(t, n, e.blkIndent, !1).trim();
  e.line = n;
  const a = e.push("paragraph_open", "p", 1);
  a.map = [t, e.line];
  const s = e.push("inline", "", 0);
  return s.content = o, s.map = [t, e.line], s.children = [], e.push("paragraph_close", "p", -1), e.parentType = i, !0;
}
const Yu = [
  // First 2 params - rule name & source. Secondary array - list of rules,
  // which can be terminated by this one.
  ["table", gl, ["paragraph", "reference"]],
  ["code", bl],
  ["fence", vl, ["paragraph", "reference", "blockquote", "list"]],
  ["blockquote", xl, ["paragraph", "reference", "blockquote", "list"]],
  ["hr", yl, ["paragraph", "reference", "blockquote", "list"]],
  ["list", kl, ["paragraph", "reference", "blockquote"]],
  ["reference", Cl],
  ["html_block", zl, ["paragraph", "reference", "blockquote"]],
  ["heading", Nl, ["paragraph", "reference", "blockquote"]],
  ["lheading", Pl],
  ["paragraph", jl]
];
function Mn() {
  this.ruler = new Me();
  for (let e = 0; e < Yu.length; e++)
    this.ruler.push(Yu[e][0], Yu[e][1], { alt: (Yu[e][2] || []).slice() });
}
Mn.prototype.tokenize = function(e, t, u) {
  const r = this.ruler.getRules(""), i = r.length, n = e.md.options.maxNesting;
  let o = t, a = !1;
  for (; o < u && (e.line = o = e.skipEmptyLines(o), !(o >= u || e.sCount[o] < e.blkIndent)); ) {
    if (e.level >= n) {
      e.line = u;
      break;
    }
    const s = e.line;
    let c = !1;
    for (let f = 0; f < i; f++)
      if (c = r[f](e, o, u, !1), c) {
        if (s >= e.line)
          throw new Error("block rule didn't increment state.line");
        break;
      }
    if (!c) throw new Error("none of the block rules matched");
    e.tight = !a, e.isEmpty(e.line - 1) && (a = !0), o = e.line, o < u && e.isEmpty(o) && (a = !0, o++, e.line = o);
  }
};
Mn.prototype.parse = function(e, t, u, r) {
  if (!e)
    return;
  const i = new this.State(e, t, u, r);
  this.tokenize(i, i.line, i.lineMax);
};
Mn.prototype.State = mt;
function Nu(e, t, u, r) {
  this.src = e, this.env = u, this.md = t, this.tokens = r, this.tokens_meta = Array(r.length), this.pos = 0, this.posMax = this.src.length, this.level = 0, this.pending = "", this.pendingLevel = 0, this.cache = {}, this.delimiters = [], this._prev_delimiters = [], this.backticks = {}, this.backticksScanned = !1, this.linkLevel = 0;
}
Nu.prototype.pushPending = function() {
  const e = new it("text", "", 0);
  return e.content = this.pending, e.level = this.pendingLevel, this.tokens.push(e), this.pending = "", e;
};
Nu.prototype.push = function(e, t, u) {
  this.pending && this.pushPending();
  const r = new it(e, t, u);
  let i = null;
  return u < 0 && (this.level--, this.delimiters = this._prev_delimiters.pop()), r.level = this.level, u > 0 && (this.level++, this._prev_delimiters.push(this.delimiters), this.delimiters = [], i = { delimiters: this.delimiters }), this.pendingLevel = this.level, this.tokens.push(r), this.tokens_meta.push(i), r;
};
Nu.prototype.scanDelims = function(e, t) {
  const u = this.posMax, r = this.src.charCodeAt(e), i = e > 0 ? this.src.charCodeAt(e - 1) : 32;
  let n = e;
  for (; n < u && this.src.charCodeAt(n) === r; )
    n++;
  const o = n - e, a = n < u ? this.src.charCodeAt(n) : 32, s = Su(i) || Tu(String.fromCharCode(i)), c = Su(a) || Tu(String.fromCharCode(a)), f = Du(i), l = Du(a), d = !l && (!c || f || s), g = !f && (!s || l || c);
  return { can_open: d && (t || !g || s), can_close: g && (t || !d || c), length: o };
};
Nu.prototype.Token = it;
function Hl(e) {
  switch (e) {
    case 10:
    case 33:
    case 35:
    case 36:
    case 37:
    case 38:
    case 42:
    case 43:
    case 45:
    case 58:
    case 60:
    case 61:
    case 62:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 125:
    case 126:
      return !0;
    default:
      return !1;
  }
}
function $l(e, t) {
  let u = e.pos;
  for (; u < e.posMax && !Hl(e.src.charCodeAt(u)); )
    u++;
  return u === e.pos ? !1 : (t || (e.pending += e.src.slice(e.pos, u)), e.pos = u, !0);
}
const Ul = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;
function ql(e, t) {
  if (!e.md.options.linkify || e.linkLevel > 0) return !1;
  const u = e.pos, r = e.posMax;
  if (u + 3 > r || e.src.charCodeAt(u) !== 58 || e.src.charCodeAt(u + 1) !== 47 || e.src.charCodeAt(u + 2) !== 47) return !1;
  const i = e.pending.match(Ul);
  if (!i) return !1;
  const n = i[1], o = e.md.linkify.matchAtStart(e.src.slice(u - n.length));
  if (!o) return !1;
  let a = o.url;
  if (a.length <= n.length) return !1;
  let s = a.length;
  for (; s > 0 && a.charCodeAt(s - 1) === 42; )
    s--;
  s !== a.length && (a = a.slice(0, s));
  const c = e.md.normalizeLink(a);
  if (!e.md.validateLink(c)) return !1;
  if (!t) {
    e.pending = e.pending.slice(0, -n.length);
    const f = e.push("link_open", "a", 1);
    f.attrs = [["href", c]], f.markup = "linkify", f.info = "auto";
    const l = e.push("text", "", 0);
    l.content = e.md.normalizeLinkText(a);
    const d = e.push("link_close", "a", -1);
    d.markup = "linkify", d.info = "auto";
  }
  return e.pos += a.length - n.length, !0;
}
function Gl(e, t) {
  let u = e.pos;
  if (e.src.charCodeAt(u) !== 10)
    return !1;
  const r = e.pending.length - 1, i = e.posMax;
  if (!t)
    if (r >= 0 && e.pending.charCodeAt(r) === 32)
      if (r >= 1 && e.pending.charCodeAt(r - 1) === 32) {
        let n = r - 1;
        for (; n >= 1 && e.pending.charCodeAt(n - 1) === 32; ) n--;
        e.pending = e.pending.slice(0, n), e.push("hardbreak", "br", 0);
      } else
        e.pending = e.pending.slice(0, -1), e.push("softbreak", "br", 0);
    else
      e.push("softbreak", "br", 0);
  for (u++; u < i && re(e.src.charCodeAt(u)); )
    u++;
  return e.pos = u, !0;
}
const Gr = [];
for (let e = 0; e < 256; e++)
  Gr.push(0);
"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(e) {
  Gr[e.charCodeAt(0)] = 1;
});
function Wl(e, t) {
  let u = e.pos;
  const r = e.posMax;
  if (e.src.charCodeAt(u) !== 92 || (u++, u >= r)) return !1;
  let i = e.src.charCodeAt(u);
  if (i === 10) {
    for (t || e.push("hardbreak", "br", 0), u++; u < r && (i = e.src.charCodeAt(u), !!re(i)); )
      u++;
    return e.pos = u, !0;
  }
  let n = e.src[u];
  if (i >= 55296 && i <= 56319 && u + 1 < r) {
    const a = e.src.charCodeAt(u + 1);
    a >= 56320 && a <= 57343 && (n += e.src[u + 1], u++);
  }
  const o = "\\" + n;
  if (!t) {
    const a = e.push("text_special", "", 0);
    i < 256 && Gr[i] !== 0 ? a.content = n : a.content = o, a.markup = o, a.info = "escape";
  }
  return e.pos = u + 1, !0;
}
function Zl(e, t) {
  let u = e.pos;
  if (e.src.charCodeAt(u) !== 96)
    return !1;
  const i = u;
  u++;
  const n = e.posMax;
  for (; u < n && e.src.charCodeAt(u) === 96; )
    u++;
  const o = e.src.slice(i, u), a = o.length;
  if (e.backticksScanned && (e.backticks[a] || 0) <= i)
    return t || (e.pending += o), e.pos += a, !0;
  let s = u, c;
  for (; (c = e.src.indexOf("`", s)) !== -1; ) {
    for (s = c + 1; s < n && e.src.charCodeAt(s) === 96; )
      s++;
    const f = s - c;
    if (f === a) {
      if (!t) {
        const l = e.push("code_inline", "code", 0);
        l.markup = o, l.content = e.src.slice(u, c).replace(/\n/g, " ").replace(/^ (.+) $/, "$1");
      }
      return e.pos = s, !0;
    }
    e.backticks[f] = c;
  }
  return e.backticksScanned = !0, t || (e.pending += o), e.pos += a, !0;
}
function Vl(e, t) {
  const u = e.pos, r = e.src.charCodeAt(u);
  if (t || r !== 126)
    return !1;
  const i = e.scanDelims(e.pos, !0);
  let n = i.length;
  const o = String.fromCharCode(r);
  if (n < 2)
    return !1;
  let a;
  n % 2 && (a = e.push("text", "", 0), a.content = o, n--);
  for (let s = 0; s < n; s += 2)
    a = e.push("text", "", 0), a.content = o + o, e.delimiters.push({
      marker: r,
      length: 0,
      // disable "rule of 3" length checks meant for emphasis
      token: e.tokens.length - 1,
      end: -1,
      open: i.can_open,
      close: i.can_close
    });
  return e.pos += i.length, !0;
}
function wi(e, t) {
  let u;
  const r = [], i = t.length;
  for (let n = 0; n < i; n++) {
    const o = t[n];
    if (o.marker !== 126 || o.end === -1)
      continue;
    const a = t[o.end];
    u = e.tokens[o.token], u.type = "s_open", u.tag = "s", u.nesting = 1, u.markup = "~~", u.content = "", u = e.tokens[a.token], u.type = "s_close", u.tag = "s", u.nesting = -1, u.markup = "~~", u.content = "", e.tokens[a.token - 1].type === "text" && e.tokens[a.token - 1].content === "~" && r.push(a.token - 1);
  }
  for (; r.length; ) {
    const n = r.pop();
    let o = n + 1;
    for (; o < e.tokens.length && e.tokens[o].type === "s_close"; )
      o++;
    o--, n !== o && (u = e.tokens[o], e.tokens[o] = e.tokens[n], e.tokens[n] = u);
  }
}
function Xl(e) {
  const t = e.tokens_meta, u = e.tokens_meta.length;
  wi(e, e.delimiters);
  for (let r = 0; r < u; r++)
    t[r] && t[r].delimiters && wi(e, t[r].delimiters);
}
const Bo = {
  tokenize: Vl,
  postProcess: Xl
};
function Yl(e, t) {
  const u = e.pos, r = e.src.charCodeAt(u);
  if (t || r !== 95 && r !== 42)
    return !1;
  const i = e.scanDelims(e.pos, r === 42);
  for (let n = 0; n < i.length; n++) {
    const o = e.push("text", "", 0);
    o.content = String.fromCharCode(r), e.delimiters.push({
      // Char code of the starting marker (number).
      //
      marker: r,
      // Total length of these series of delimiters.
      //
      length: i.length,
      // A position of the token this delimiter corresponds to.
      //
      token: e.tokens.length - 1,
      // If this delimiter is matched as a valid opener, `end` will be
      // equal to its position, otherwise it's `-1`.
      //
      end: -1,
      // Boolean flags that determine if this delimiter could open or close
      // an emphasis.
      //
      open: i.can_open,
      close: i.can_close
    });
  }
  return e.pos += i.length, !0;
}
function Ei(e, t) {
  const u = t.length;
  for (let r = u - 1; r >= 0; r--) {
    const i = t[r];
    if (i.marker !== 95 && i.marker !== 42 || i.end === -1)
      continue;
    const n = t[i.end], o = r > 0 && t[r - 1].end === i.end + 1 && // check that first two markers match and adjacent
    t[r - 1].marker === i.marker && t[r - 1].token === i.token - 1 && // check that last two markers are adjacent (we can safely assume they match)
    t[i.end + 1].token === n.token + 1, a = String.fromCharCode(i.marker), s = e.tokens[i.token];
    s.type = o ? "strong_open" : "em_open", s.tag = o ? "strong" : "em", s.nesting = 1, s.markup = o ? a + a : a, s.content = "";
    const c = e.tokens[n.token];
    c.type = o ? "strong_close" : "em_close", c.tag = o ? "strong" : "em", c.nesting = -1, c.markup = o ? a + a : a, c.content = "", o && (e.tokens[t[r - 1].token].content = "", e.tokens[t[i.end + 1].token].content = "", r--);
  }
}
function Ql(e) {
  const t = e.tokens_meta, u = e.tokens_meta.length;
  Ei(e, e.delimiters);
  for (let r = 0; r < u; r++)
    t[r] && t[r].delimiters && Ei(e, t[r].delimiters);
}
const zo = {
  tokenize: Yl,
  postProcess: Ql
};
function Kl(e, t) {
  let u, r, i, n, o = "", a = "", s = e.pos, c = !0;
  if (e.src.charCodeAt(e.pos) !== 91)
    return !1;
  const f = e.pos, l = e.posMax, d = e.pos + 1, g = e.md.helpers.parseLinkLabel(e, e.pos, !0);
  if (g < 0)
    return !1;
  let p = g + 1;
  if (p < l && e.src.charCodeAt(p) === 40) {
    for (c = !1, p++; p < l && (u = e.src.charCodeAt(p), !(!re(u) && u !== 10)); p++)
      ;
    if (p >= l)
      return !1;
    if (s = p, i = e.md.helpers.parseLinkDestination(e.src, p, e.posMax), i.ok) {
      for (o = e.md.normalizeLink(i.str), e.md.validateLink(o) ? p = i.pos : o = "", s = p; p < l && (u = e.src.charCodeAt(p), !(!re(u) && u !== 10)); p++)
        ;
      if (i = e.md.helpers.parseLinkTitle(e.src, p, e.posMax), p < l && s !== p && i.ok)
        for (a = i.str, p = i.pos; p < l && (u = e.src.charCodeAt(p), !(!re(u) && u !== 10)); p++)
          ;
    }
    (p >= l || e.src.charCodeAt(p) !== 41) && (c = !0), p++;
  }
  if (c) {
    if (typeof e.env.references > "u")
      return !1;
    if (p < l && e.src.charCodeAt(p) === 91 ? (s = p + 1, p = e.md.helpers.parseLinkLabel(e, p), p >= 0 ? r = e.src.slice(s, p++) : p = g + 1) : p = g + 1, r || (r = e.src.slice(d, g)), n = e.env.references[On(r)], !n)
      return e.pos = f, !1;
    o = n.href, a = n.title;
  }
  if (!t) {
    e.pos = d, e.posMax = g;
    const C = e.push("link_open", "a", 1), k = [["href", o]];
    C.attrs = k, a && k.push(["title", a]), e.linkLevel++, e.md.inline.tokenize(e), e.linkLevel--, e.push("link_close", "a", -1);
  }
  return e.pos = p, e.posMax = l, !0;
}
function Jl(e, t) {
  let u, r, i, n, o, a, s, c, f = "";
  const l = e.pos, d = e.posMax;
  if (e.src.charCodeAt(e.pos) !== 33 || e.src.charCodeAt(e.pos + 1) !== 91)
    return !1;
  const g = e.pos + 2, p = e.md.helpers.parseLinkLabel(e, e.pos + 1, !1);
  if (p < 0)
    return !1;
  if (n = p + 1, n < d && e.src.charCodeAt(n) === 40) {
    for (n++; n < d && (u = e.src.charCodeAt(n), !(!re(u) && u !== 10)); n++)
      ;
    if (n >= d)
      return !1;
    for (c = n, a = e.md.helpers.parseLinkDestination(e.src, n, e.posMax), a.ok && (f = e.md.normalizeLink(a.str), e.md.validateLink(f) ? n = a.pos : f = ""), c = n; n < d && (u = e.src.charCodeAt(n), !(!re(u) && u !== 10)); n++)
      ;
    if (a = e.md.helpers.parseLinkTitle(e.src, n, e.posMax), n < d && c !== n && a.ok)
      for (s = a.str, n = a.pos; n < d && (u = e.src.charCodeAt(n), !(!re(u) && u !== 10)); n++)
        ;
    else
      s = "";
    if (n >= d || e.src.charCodeAt(n) !== 41)
      return e.pos = l, !1;
    n++;
  } else {
    if (typeof e.env.references > "u")
      return !1;
    if (n < d && e.src.charCodeAt(n) === 91 ? (c = n + 1, n = e.md.helpers.parseLinkLabel(e, n), n >= 0 ? i = e.src.slice(c, n++) : n = p + 1) : n = p + 1, i || (i = e.src.slice(g, p)), o = e.env.references[On(i)], !o)
      return e.pos = l, !1;
    f = o.href, s = o.title;
  }
  if (!t) {
    r = e.src.slice(g, p);
    const C = [];
    e.md.inline.parse(
      r,
      e.md,
      e.env,
      C
    );
    const k = e.push("image", "img", 0), w = [["src", f], ["alt", ""]];
    k.attrs = w, k.children = C, k.content = r, s && w.push(["title", s]);
  }
  return e.pos = n, e.posMax = d, !0;
}
const ec = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/, tc = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;
function uc(e, t) {
  let u = e.pos;
  if (e.src.charCodeAt(u) !== 60)
    return !1;
  const r = e.pos, i = e.posMax;
  for (; ; ) {
    if (++u >= i) return !1;
    const o = e.src.charCodeAt(u);
    if (o === 60) return !1;
    if (o === 62) break;
  }
  const n = e.src.slice(r + 1, u);
  if (tc.test(n)) {
    const o = e.md.normalizeLink(n);
    if (!e.md.validateLink(o))
      return !1;
    if (!t) {
      const a = e.push("link_open", "a", 1);
      a.attrs = [["href", o]], a.markup = "autolink", a.info = "auto";
      const s = e.push("text", "", 0);
      s.content = e.md.normalizeLinkText(n);
      const c = e.push("link_close", "a", -1);
      c.markup = "autolink", c.info = "auto";
    }
    return e.pos += n.length + 2, !0;
  }
  if (ec.test(n)) {
    const o = e.md.normalizeLink("mailto:" + n);
    if (!e.md.validateLink(o))
      return !1;
    if (!t) {
      const a = e.push("link_open", "a", 1);
      a.attrs = [["href", o]], a.markup = "autolink", a.info = "auto";
      const s = e.push("text", "", 0);
      s.content = e.md.normalizeLinkText(n);
      const c = e.push("link_close", "a", -1);
      c.markup = "autolink", c.info = "auto";
    }
    return e.pos += n.length + 2, !0;
  }
  return !1;
}
function nc(e) {
  return /^<a[>\s]/i.test(e);
}
function rc(e) {
  return /^<\/a\s*>/i.test(e);
}
function ic(e) {
  const t = e | 32;
  return t >= 97 && t <= 122;
}
function oc(e, t) {
  if (!e.md.options.html)
    return !1;
  const u = e.posMax, r = e.pos;
  if (e.src.charCodeAt(r) !== 60 || r + 2 >= u)
    return !1;
  const i = e.src.charCodeAt(r + 1);
  if (i !== 33 && i !== 63 && i !== 47 && !ic(i))
    return !1;
  const n = e.src.slice(r).match(Rl);
  if (!n)
    return !1;
  if (!t) {
    const o = e.push("html_inline", "", 0);
    o.content = n[0], nc(o.content) && e.linkLevel++, rc(o.content) && e.linkLevel--;
  }
  return e.pos += n[0].length, !0;
}
const ac = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i, sc = /^&([a-z][a-z0-9]{1,31});/i;
function lc(e, t) {
  const u = e.pos, r = e.posMax;
  if (e.src.charCodeAt(u) !== 38 || u + 1 >= r) return !1;
  if (e.src.charCodeAt(u + 1) === 35) {
    const n = e.src.slice(u).match(ac);
    if (n) {
      if (!t) {
        const o = n[1][0].toLowerCase() === "x" ? parseInt(n[1].slice(1), 16) : parseInt(n[1], 10), a = e.push("text_special", "", 0);
        a.content = Ur(o) ? En(o) : En(65533), a.markup = n[0], a.info = "entity";
      }
      return e.pos += n[0].length, !0;
    }
  } else {
    const n = e.src.slice(u).match(sc);
    if (n) {
      const o = To(n[0]);
      if (o !== n[0]) {
        if (!t) {
          const a = e.push("text_special", "", 0);
          a.content = o, a.markup = n[0], a.info = "entity";
        }
        return e.pos += n[0].length, !0;
      }
    }
  }
  return !1;
}
function Fi(e) {
  const t = {}, u = e.length;
  if (!u) return;
  let r = 0, i = -2;
  const n = [];
  for (let o = 0; o < u; o++) {
    const a = e[o];
    if (n.push(0), (e[r].marker !== a.marker || i !== a.token - 1) && (r = o), i = a.token, a.length = a.length || 0, !a.close) continue;
    t.hasOwnProperty(a.marker) || (t[a.marker] = [-1, -1, -1, -1, -1, -1]);
    const s = t[a.marker][(a.open ? 3 : 0) + a.length % 3];
    let c = r - n[r] - 1, f = c;
    for (; c > s; c -= n[c] + 1) {
      const l = e[c];
      if (l.marker === a.marker && l.open && l.end < 0) {
        let d = !1;
        if ((l.close || a.open) && (l.length + a.length) % 3 === 0 && (l.length % 3 !== 0 || a.length % 3 !== 0) && (d = !0), !d) {
          const g = c > 0 && !e[c - 1].open ? n[c - 1] + 1 : 0;
          n[o] = o - c + g, n[c] = g, a.open = !1, l.end = o, l.close = !1, f = -1, i = -2;
          break;
        }
      }
    }
    f !== -1 && (t[a.marker][(a.open ? 3 : 0) + (a.length || 0) % 3] = f);
  }
}
function cc(e) {
  const t = e.tokens_meta, u = e.tokens_meta.length;
  Fi(e.delimiters);
  for (let r = 0; r < u; r++)
    t[r] && t[r].delimiters && Fi(t[r].delimiters);
}
function fc(e) {
  let t, u, r = 0;
  const i = e.tokens, n = e.tokens.length;
  for (t = u = 0; t < n; t++)
    i[t].nesting < 0 && r--, i[t].level = r, i[t].nesting > 0 && r++, i[t].type === "text" && t + 1 < n && i[t + 1].type === "text" ? i[t + 1].content = i[t].content + i[t + 1].content : (t !== u && (i[u] = i[t]), u++);
  t !== u && (i.length = u);
}
const Xn = [
  ["text", $l],
  ["linkify", ql],
  ["newline", Gl],
  ["escape", Wl],
  ["backticks", Zl],
  ["strikethrough", Bo.tokenize],
  ["emphasis", zo.tokenize],
  ["link", Kl],
  ["image", Jl],
  ["autolink", uc],
  ["html_inline", oc],
  ["entity", lc]
], Yn = [
  ["balance_pairs", cc],
  ["strikethrough", Bo.postProcess],
  ["emphasis", zo.postProcess],
  // rules for pairs separate '**' into its own text tokens, which may be left unused,
  // rule below merges unused segments back with the rest of the text
  ["fragments_join", fc]
];
function Pu() {
  this.ruler = new Me();
  for (let e = 0; e < Xn.length; e++)
    this.ruler.push(Xn[e][0], Xn[e][1]);
  this.ruler2 = new Me();
  for (let e = 0; e < Yn.length; e++)
    this.ruler2.push(Yn[e][0], Yn[e][1]);
}
Pu.prototype.skipToken = function(e) {
  const t = e.pos, u = this.ruler.getRules(""), r = u.length, i = e.md.options.maxNesting, n = e.cache;
  if (typeof n[t] < "u") {
    e.pos = n[t];
    return;
  }
  let o = !1;
  if (e.level < i) {
    for (let a = 0; a < r; a++)
      if (e.level++, o = u[a](e, !0), e.level--, o) {
        if (t >= e.pos)
          throw new Error("inline rule didn't increment state.pos");
        break;
      }
  } else
    e.pos = e.posMax;
  o || e.pos++, n[t] = e.pos;
};
Pu.prototype.tokenize = function(e) {
  const t = this.ruler.getRules(""), u = t.length, r = e.posMax, i = e.md.options.maxNesting;
  for (; e.pos < r; ) {
    const n = e.pos;
    let o = !1;
    if (e.level < i) {
      for (let a = 0; a < u; a++)
        if (o = t[a](e, !1), o) {
          if (n >= e.pos)
            throw new Error("inline rule didn't increment state.pos");
          break;
        }
    }
    if (o) {
      if (e.pos >= r)
        break;
      continue;
    }
    e.pending += e.src[e.pos++];
  }
  e.pending && e.pushPending();
};
Pu.prototype.parse = function(e, t, u, r) {
  const i = new this.State(e, t, u, r);
  this.tokenize(i);
  const n = this.ruler2.getRules(""), o = n.length;
  for (let a = 0; a < o; a++)
    n[a](i);
};
Pu.prototype.State = Nu;
function dc(e) {
  const t = {};
  e = e || {}, t.src_Any = _o.source, t.src_Cc = wo.source, t.src_Z = Fo.source, t.src_P = Hr.source, t.src_ZPCc = [t.src_Z, t.src_P, t.src_Cc].join("|"), t.src_ZCc = [t.src_Z, t.src_Cc].join("|");
  const u = "[><｜]";
  return t.src_pseudo_letter = "(?:(?!" + u + "|" + t.src_ZPCc + ")" + t.src_Any + ")", t.src_ip4 = "(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)", t.src_auth = "(?:(?:(?!" + t.src_ZCc + "|[@/\\[\\]()]).)+@)?", t.src_port = "(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?", t.src_host_terminator = "(?=$|" + u + "|" + t.src_ZPCc + ")(?!" + (e["---"] ? "-(?!--)|" : "-|") + "_|:\\d|\\.-|\\.(?!$|" + t.src_ZPCc + "))", t.src_path = "(?:[/?#](?:(?!" + t.src_ZCc + "|" + u + `|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!` + t.src_ZCc + "|\\]).)*\\]|\\((?:(?!" + t.src_ZCc + "|[)]).)*\\)|\\{(?:(?!" + t.src_ZCc + '|[}]).)*\\}|\\"(?:(?!' + t.src_ZCc + `|["]).)+\\"|\\'(?:(?!` + t.src_ZCc + "|[']).)+\\'|\\'(?=" + t.src_pseudo_letter + "|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!" + t.src_ZCc + "|[.]|$)|" + (e["---"] ? "\\-(?!--(?:[^-]|$))(?:-*)|" : "\\-+|") + // allow `,,,` in paths
  ",(?!" + t.src_ZCc + "|$)|;(?!" + t.src_ZCc + "|$)|\\!+(?!" + t.src_ZCc + "|[!]|$)|\\?(?!" + t.src_ZCc + "|[?]|$))+|\\/)?", t.src_email_name = '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*', t.src_xn = "xn--[a-z0-9\\-]{1,59}", t.src_domain_root = // Allow letters & digits (http://test1)
  "(?:" + t.src_xn + "|" + t.src_pseudo_letter + "{1,63})", t.src_domain = "(?:" + t.src_xn + "|(?:" + t.src_pseudo_letter + ")|(?:" + t.src_pseudo_letter + "(?:-|" + t.src_pseudo_letter + "){0,61}" + t.src_pseudo_letter + "))", t.src_host = "(?:(?:(?:(?:" + t.src_domain + ")\\.)*" + t.src_domain + "))", t.tpl_host_fuzzy = "(?:" + t.src_ip4 + "|(?:(?:(?:" + t.src_domain + ")\\.)+(?:%TLDS%)))", t.tpl_host_no_ip_fuzzy = "(?:(?:(?:" + t.src_domain + ")\\.)+(?:%TLDS%))", t.src_host_strict = t.src_host + t.src_host_terminator, t.tpl_host_fuzzy_strict = t.tpl_host_fuzzy + t.src_host_terminator, t.src_host_port_strict = t.src_host + t.src_port + t.src_host_terminator, t.tpl_host_port_fuzzy_strict = t.tpl_host_fuzzy + t.src_port + t.src_host_terminator, t.tpl_host_port_no_ip_fuzzy_strict = t.tpl_host_no_ip_fuzzy + t.src_port + t.src_host_terminator, t.tpl_host_fuzzy_test = "localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:" + t.src_ZPCc + "|>|$))", t.tpl_email_fuzzy = "(^|" + u + '|"|\\(|' + t.src_ZCc + ")(" + t.src_email_name + "@" + t.tpl_host_fuzzy_strict + ")", t.tpl_link_fuzzy = // Fuzzy link can't be prepended with .:/\- and non punctuation.
  // but can start with > (markdown blockquote)
  "(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|" + t.src_ZPCc + "))((?![$+<=>^`|｜])" + t.tpl_host_port_fuzzy_strict + t.src_path + ")", t.tpl_link_no_ip_fuzzy = // Fuzzy link can't be prepended with .:/\- and non punctuation.
  // but can start with > (markdown blockquote)
  "(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|" + t.src_ZPCc + "))((?![$+<=>^`|｜])" + t.tpl_host_port_no_ip_fuzzy_strict + t.src_path + ")", t;
}
function gr(e) {
  return Array.prototype.slice.call(arguments, 1).forEach(function(u) {
    u && Object.keys(u).forEach(function(r) {
      e[r] = u[r];
    });
  }), e;
}
function Rn(e) {
  return Object.prototype.toString.call(e);
}
function hc(e) {
  return Rn(e) === "[object String]";
}
function pc(e) {
  return Rn(e) === "[object Object]";
}
function mc(e) {
  return Rn(e) === "[object RegExp]";
}
function Di(e) {
  return Rn(e) === "[object Function]";
}
function gc(e) {
  return e.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}
const No = {
  fuzzyLink: !0,
  fuzzyEmail: !0,
  fuzzyIP: !1
};
function bc(e) {
  return Object.keys(e || {}).reduce(function(t, u) {
    return t || No.hasOwnProperty(u);
  }, !1);
}
const vc = {
  "http:": {
    validate: function(e, t, u) {
      const r = e.slice(t);
      return u.re.http || (u.re.http = new RegExp(
        "^\\/\\/" + u.re.src_auth + u.re.src_host_port_strict + u.re.src_path,
        "i"
      )), u.re.http.test(r) ? r.match(u.re.http)[0].length : 0;
    }
  },
  "https:": "http:",
  "ftp:": "http:",
  "//": {
    validate: function(e, t, u) {
      const r = e.slice(t);
      return u.re.no_http || (u.re.no_http = new RegExp(
        "^" + u.re.src_auth + // Don't allow single-level domains, because of false positives like '//test'
        // with code comments
        "(?:localhost|(?:(?:" + u.re.src_domain + ")\\.)+" + u.re.src_domain_root + ")" + u.re.src_port + u.re.src_host_terminator + u.re.src_path,
        "i"
      )), u.re.no_http.test(r) ? t >= 3 && e[t - 3] === ":" || t >= 3 && e[t - 3] === "/" ? 0 : r.match(u.re.no_http)[0].length : 0;
    }
  },
  "mailto:": {
    validate: function(e, t, u) {
      const r = e.slice(t);
      return u.re.mailto || (u.re.mailto = new RegExp(
        "^" + u.re.src_email_name + "@" + u.re.src_host_strict,
        "i"
      )), u.re.mailto.test(r) ? r.match(u.re.mailto)[0].length : 0;
    }
  }
}, xc = "a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]", yc = "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф".split("|");
function Ac(e) {
  e.__index__ = -1, e.__text_cache__ = "";
}
function kc(e) {
  return function(t, u) {
    const r = t.slice(u);
    return e.test(r) ? r.match(e)[0].length : 0;
  };
}
function Ti() {
  return function(e, t) {
    t.normalize(e);
  };
}
function Fn(e) {
  const t = e.re = dc(e.__opts__), u = e.__tlds__.slice();
  e.onCompile(), e.__tlds_replaced__ || u.push(xc), u.push(t.src_xn), t.src_tlds = u.join("|");
  function r(a) {
    return a.replace("%TLDS%", t.src_tlds);
  }
  t.email_fuzzy = RegExp(r(t.tpl_email_fuzzy), "i"), t.link_fuzzy = RegExp(r(t.tpl_link_fuzzy), "i"), t.link_no_ip_fuzzy = RegExp(r(t.tpl_link_no_ip_fuzzy), "i"), t.host_fuzzy_test = RegExp(r(t.tpl_host_fuzzy_test), "i");
  const i = [];
  e.__compiled__ = {};
  function n(a, s) {
    throw new Error('(LinkifyIt) Invalid schema "' + a + '": ' + s);
  }
  Object.keys(e.__schemas__).forEach(function(a) {
    const s = e.__schemas__[a];
    if (s === null)
      return;
    const c = { validate: null, link: null };
    if (e.__compiled__[a] = c, pc(s)) {
      mc(s.validate) ? c.validate = kc(s.validate) : Di(s.validate) ? c.validate = s.validate : n(a, s), Di(s.normalize) ? c.normalize = s.normalize : s.normalize ? n(a, s) : c.normalize = Ti();
      return;
    }
    if (hc(s)) {
      i.push(a);
      return;
    }
    n(a, s);
  }), i.forEach(function(a) {
    e.__compiled__[e.__schemas__[a]] && (e.__compiled__[a].validate = e.__compiled__[e.__schemas__[a]].validate, e.__compiled__[a].normalize = e.__compiled__[e.__schemas__[a]].normalize);
  }), e.__compiled__[""] = { validate: null, normalize: Ti() };
  const o = Object.keys(e.__compiled__).filter(function(a) {
    return a.length > 0 && e.__compiled__[a];
  }).map(gc).join("|");
  e.re.schema_test = RegExp("(^|(?!_)(?:[><｜]|" + t.src_ZPCc + "))(" + o + ")", "i"), e.re.schema_search = RegExp("(^|(?!_)(?:[><｜]|" + t.src_ZPCc + "))(" + o + ")", "ig"), e.re.schema_at_start = RegExp("^" + e.re.schema_search.source, "i"), e.re.pretest = RegExp(
    "(" + e.re.schema_test.source + ")|(" + e.re.host_fuzzy_test.source + ")|@",
    "i"
  ), Ac(e);
}
function Cc(e, t) {
  const u = e.__index__, r = e.__last_index__, i = e.__text_cache__.slice(u, r);
  this.schema = e.__schema__.toLowerCase(), this.index = u + t, this.lastIndex = r + t, this.raw = i, this.text = i, this.url = i;
}
function br(e, t) {
  const u = new Cc(e, t);
  return e.__compiled__[u.schema].normalize(u, e), u;
}
function $e(e, t) {
  if (!(this instanceof $e))
    return new $e(e, t);
  t || bc(e) && (t = e, e = {}), this.__opts__ = gr({}, No, t), this.__index__ = -1, this.__last_index__ = -1, this.__schema__ = "", this.__text_cache__ = "", this.__schemas__ = gr({}, vc, e), this.__compiled__ = {}, this.__tlds__ = yc, this.__tlds_replaced__ = !1, this.re = {}, Fn(this);
}
$e.prototype.add = function(t, u) {
  return this.__schemas__[t] = u, Fn(this), this;
};
$e.prototype.set = function(t) {
  return this.__opts__ = gr(this.__opts__, t), this;
};
$e.prototype.test = function(t) {
  if (this.__text_cache__ = t, this.__index__ = -1, !t.length)
    return !1;
  let u, r, i, n, o, a, s, c, f;
  if (this.re.schema_test.test(t)) {
    for (s = this.re.schema_search, s.lastIndex = 0; (u = s.exec(t)) !== null; )
      if (n = this.testSchemaAt(t, u[2], s.lastIndex), n) {
        this.__schema__ = u[2], this.__index__ = u.index + u[1].length, this.__last_index__ = u.index + u[0].length + n;
        break;
      }
  }
  return this.__opts__.fuzzyLink && this.__compiled__["http:"] && (c = t.search(this.re.host_fuzzy_test), c >= 0 && (this.__index__ < 0 || c < this.__index__) && (r = t.match(this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy)) !== null && (o = r.index + r[1].length, (this.__index__ < 0 || o < this.__index__) && (this.__schema__ = "", this.__index__ = o, this.__last_index__ = r.index + r[0].length))), this.__opts__.fuzzyEmail && this.__compiled__["mailto:"] && (f = t.indexOf("@"), f >= 0 && (i = t.match(this.re.email_fuzzy)) !== null && (o = i.index + i[1].length, a = i.index + i[0].length, (this.__index__ < 0 || o < this.__index__ || o === this.__index__ && a > this.__last_index__) && (this.__schema__ = "mailto:", this.__index__ = o, this.__last_index__ = a))), this.__index__ >= 0;
};
$e.prototype.pretest = function(t) {
  return this.re.pretest.test(t);
};
$e.prototype.testSchemaAt = function(t, u, r) {
  return this.__compiled__[u.toLowerCase()] ? this.__compiled__[u.toLowerCase()].validate(t, r, this) : 0;
};
$e.prototype.match = function(t) {
  const u = [];
  let r = 0;
  this.__index__ >= 0 && this.__text_cache__ === t && (u.push(br(this, r)), r = this.__last_index__);
  let i = r ? t.slice(r) : t;
  for (; this.test(i); )
    u.push(br(this, r)), i = i.slice(this.__last_index__), r += this.__last_index__;
  return u.length ? u : null;
};
$e.prototype.matchAtStart = function(t) {
  if (this.__text_cache__ = t, this.__index__ = -1, !t.length) return null;
  const u = this.re.schema_at_start.exec(t);
  if (!u) return null;
  const r = this.testSchemaAt(t, u[2], u[0].length);
  return r ? (this.__schema__ = u[2], this.__index__ = u.index + u[1].length, this.__last_index__ = u.index + u[0].length + r, br(this, 0)) : null;
};
$e.prototype.tlds = function(t, u) {
  return t = Array.isArray(t) ? t : [t], u ? (this.__tlds__ = this.__tlds__.concat(t).sort().filter(function(r, i, n) {
    return r !== n[i - 1];
  }).reverse(), Fn(this), this) : (this.__tlds__ = t.slice(), this.__tlds_replaced__ = !0, Fn(this), this);
};
$e.prototype.normalize = function(t) {
  t.schema || (t.url = "http://" + t.url), t.schema === "mailto:" && !/^mailto:/i.test(t.url) && (t.url = "mailto:" + t.url);
};
$e.prototype.onCompile = function() {
};
const eu = 2147483647, ft = 36, Wr = 1, Lu = 26, _c = 38, wc = 700, Po = 72, jo = 128, Ho = "-", Ec = /^xn--/, Fc = /[^\0-\x7F]/, Dc = /[\x2E\u3002\uFF0E\uFF61]/g, Tc = {
  overflow: "Overflow: input needs wider integers to process",
  "not-basic": "Illegal input >= 0x80 (not a basic code point)",
  "invalid-input": "Invalid input"
}, Qn = ft - Wr, dt = Math.floor, Kn = String.fromCharCode;
function Ft(e) {
  throw new RangeError(Tc[e]);
}
function Sc(e, t) {
  const u = [];
  let r = e.length;
  for (; r--; )
    u[r] = t(e[r]);
  return u;
}
function $o(e, t) {
  const u = e.split("@");
  let r = "";
  u.length > 1 && (r = u[0] + "@", e = u[1]), e = e.replace(Dc, ".");
  const i = e.split("."), n = Sc(i, t).join(".");
  return r + n;
}
function Uo(e) {
  const t = [];
  let u = 0;
  const r = e.length;
  for (; u < r; ) {
    const i = e.charCodeAt(u++);
    if (i >= 55296 && i <= 56319 && u < r) {
      const n = e.charCodeAt(u++);
      (n & 64512) == 56320 ? t.push(((i & 1023) << 10) + (n & 1023) + 65536) : (t.push(i), u--);
    } else
      t.push(i);
  }
  return t;
}
const Lc = (e) => String.fromCodePoint(...e), Ic = function(e) {
  return e >= 48 && e < 58 ? 26 + (e - 48) : e >= 65 && e < 91 ? e - 65 : e >= 97 && e < 123 ? e - 97 : ft;
}, Si = function(e, t) {
  return e + 22 + 75 * (e < 26) - ((t != 0) << 5);
}, qo = function(e, t, u) {
  let r = 0;
  for (e = u ? dt(e / wc) : e >> 1, e += dt(e / t); e > Qn * Lu >> 1; r += ft)
    e = dt(e / Qn);
  return dt(r + (Qn + 1) * e / (e + _c));
}, Go = function(e) {
  const t = [], u = e.length;
  let r = 0, i = jo, n = Po, o = e.lastIndexOf(Ho);
  o < 0 && (o = 0);
  for (let a = 0; a < o; ++a)
    e.charCodeAt(a) >= 128 && Ft("not-basic"), t.push(e.charCodeAt(a));
  for (let a = o > 0 ? o + 1 : 0; a < u; ) {
    const s = r;
    for (let f = 1, l = ft; ; l += ft) {
      a >= u && Ft("invalid-input");
      const d = Ic(e.charCodeAt(a++));
      d >= ft && Ft("invalid-input"), d > dt((eu - r) / f) && Ft("overflow"), r += d * f;
      const g = l <= n ? Wr : l >= n + Lu ? Lu : l - n;
      if (d < g)
        break;
      const p = ft - g;
      f > dt(eu / p) && Ft("overflow"), f *= p;
    }
    const c = t.length + 1;
    n = qo(r - s, c, s == 0), dt(r / c) > eu - i && Ft("overflow"), i += dt(r / c), r %= c, t.splice(r++, 0, i);
  }
  return String.fromCodePoint(...t);
}, Wo = function(e) {
  const t = [];
  e = Uo(e);
  const u = e.length;
  let r = jo, i = 0, n = Po;
  for (const s of e)
    s < 128 && t.push(Kn(s));
  const o = t.length;
  let a = o;
  for (o && t.push(Ho); a < u; ) {
    let s = eu;
    for (const f of e)
      f >= r && f < s && (s = f);
    const c = a + 1;
    s - r > dt((eu - i) / c) && Ft("overflow"), i += (s - r) * c, r = s;
    for (const f of e)
      if (f < r && ++i > eu && Ft("overflow"), f === r) {
        let l = i;
        for (let d = ft; ; d += ft) {
          const g = d <= n ? Wr : d >= n + Lu ? Lu : d - n;
          if (l < g)
            break;
          const p = l - g, C = ft - g;
          t.push(
            Kn(Si(g + p % C, 0))
          ), l = dt(p / C);
        }
        t.push(Kn(Si(l, 0))), n = qo(i, c, a === o), i = 0, ++a;
      }
    ++i, ++r;
  }
  return t.join("");
}, Oc = function(e) {
  return $o(e, function(t) {
    return Ec.test(t) ? Go(t.slice(4).toLowerCase()) : t;
  });
}, Mc = function(e) {
  return $o(e, function(t) {
    return Fc.test(t) ? "xn--" + Wo(t) : t;
  });
}, Zo = {
  /**
   * A string representing the current Punycode.js version number.
   * @memberOf punycode
   * @type String
   */
  version: "2.3.1",
  /**
   * An object of methods to convert from JavaScript's internal character
   * representation (UCS-2) to Unicode code points, and back.
   * @see <https://mathiasbynens.be/notes/javascript-encoding>
   * @memberOf punycode
   * @type Object
   */
  ucs2: {
    decode: Uo,
    encode: Lc
  },
  decode: Go,
  encode: Wo,
  toASCII: Mc,
  toUnicode: Oc
}, Rc = {
  options: {
    // Enable HTML tags in source
    html: !1,
    // Use '/' to close single tags (<br />)
    xhtmlOut: !1,
    // Convert '\n' in paragraphs into <br>
    breaks: !1,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: !1,
    // Enable some language-neutral replacements + quotes beautification
    typographer: !1,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 100
  },
  components: {
    core: {},
    block: {},
    inline: {}
  }
}, Bc = {
  options: {
    // Enable HTML tags in source
    html: !1,
    // Use '/' to close single tags (<br />)
    xhtmlOut: !1,
    // Convert '\n' in paragraphs into <br>
    breaks: !1,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: !1,
    // Enable some language-neutral replacements + quotes beautification
    typographer: !1,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 20
  },
  components: {
    core: {
      rules: [
        "normalize",
        "block",
        "inline",
        "text_join"
      ]
    },
    block: {
      rules: [
        "paragraph"
      ]
    },
    inline: {
      rules: [
        "text"
      ],
      rules2: [
        "balance_pairs",
        "fragments_join"
      ]
    }
  }
}, zc = {
  options: {
    // Enable HTML tags in source
    html: !0,
    // Use '/' to close single tags (<br />)
    xhtmlOut: !0,
    // Convert '\n' in paragraphs into <br>
    breaks: !1,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: !1,
    // Enable some language-neutral replacements + quotes beautification
    typographer: !1,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 20
  },
  components: {
    core: {
      rules: [
        "normalize",
        "block",
        "inline",
        "text_join"
      ]
    },
    block: {
      rules: [
        "blockquote",
        "code",
        "fence",
        "heading",
        "hr",
        "html_block",
        "lheading",
        "list",
        "reference",
        "paragraph"
      ]
    },
    inline: {
      rules: [
        "autolink",
        "backticks",
        "emphasis",
        "entity",
        "escape",
        "html_inline",
        "image",
        "link",
        "newline",
        "text"
      ],
      rules2: [
        "balance_pairs",
        "emphasis",
        "fragments_join"
      ]
    }
  }
}, Nc = {
  default: Rc,
  zero: Bc,
  commonmark: zc
}, Pc = /^(vbscript|javascript|file|data):/, jc = /^data:image\/(gif|png|jpeg|webp);/;
function Hc(e) {
  const t = e.trim().toLowerCase();
  return Pc.test(t) ? jc.test(t) : !0;
}
const Vo = ["http:", "https:", "mailto:"];
function $c(e) {
  const t = jr(e, !0);
  if (t.hostname && (!t.protocol || Vo.indexOf(t.protocol) >= 0))
    try {
      t.hostname = Zo.toASCII(t.hostname);
    } catch {
    }
  return zu(Pr(t));
}
function Uc(e) {
  const t = jr(e, !0);
  if (t.hostname && (!t.protocol || Vo.indexOf(t.protocol) >= 0))
    try {
      t.hostname = Zo.toUnicode(t.hostname);
    } catch {
    }
  return au(Pr(t), au.defaultChars + "%");
}
function Ue(e, t) {
  if (!(this instanceof Ue))
    return new Ue(e, t);
  t || $r(e) || (t = e || {}, e = "default"), this.inline = new Pu(), this.block = new Mn(), this.core = new qr(), this.renderer = new lu(), this.linkify = new $e(), this.validateLink = Hc, this.normalizeLink = $c, this.normalizeLinkText = Uc, this.utils = Gs, this.helpers = In({}, Xs), this.options = {}, this.configure(e), t && this.set(t);
}
Ue.prototype.set = function(e) {
  return In(this.options, e), this;
};
Ue.prototype.configure = function(e) {
  const t = this;
  if ($r(e)) {
    const u = e;
    if (e = Nc[u], !e)
      throw new Error('Wrong `markdown-it` preset "' + u + '", check name');
  }
  if (!e)
    throw new Error("Wrong `markdown-it` preset, can't be empty");
  return e.options && t.set(e.options), e.components && Object.keys(e.components).forEach(function(u) {
    e.components[u].rules && t[u].ruler.enableOnly(e.components[u].rules), e.components[u].rules2 && t[u].ruler2.enableOnly(e.components[u].rules2);
  }), this;
};
Ue.prototype.enable = function(e, t) {
  let u = [];
  Array.isArray(e) || (e = [e]), ["core", "block", "inline"].forEach(function(i) {
    u = u.concat(this[i].ruler.enable(e, !0));
  }, this), u = u.concat(this.inline.ruler2.enable(e, !0));
  const r = e.filter(function(i) {
    return u.indexOf(i) < 0;
  });
  if (r.length && !t)
    throw new Error("MarkdownIt. Failed to enable unknown rule(s): " + r);
  return this;
};
Ue.prototype.disable = function(e, t) {
  let u = [];
  Array.isArray(e) || (e = [e]), ["core", "block", "inline"].forEach(function(i) {
    u = u.concat(this[i].ruler.disable(e, !0));
  }, this), u = u.concat(this.inline.ruler2.disable(e, !0));
  const r = e.filter(function(i) {
    return u.indexOf(i) < 0;
  });
  if (r.length && !t)
    throw new Error("MarkdownIt. Failed to disable unknown rule(s): " + r);
  return this;
};
Ue.prototype.use = function(e) {
  const t = [this].concat(Array.prototype.slice.call(arguments, 1));
  return e.apply(e, t), this;
};
Ue.prototype.parse = function(e, t) {
  if (typeof e != "string")
    throw new Error("Input data should be a String");
  const u = new this.core.State(e, this, t);
  return this.core.process(u), u.tokens;
};
Ue.prototype.render = function(e, t) {
  return t = t || {}, this.renderer.render(this.parse(e, t), this.options, t);
};
Ue.prototype.parseInline = function(e, t) {
  const u = new this.core.State(e, this, t);
  return u.inlineMode = !0, this.core.process(u), u.tokens;
};
Ue.prototype.renderInline = function(e, t) {
  return t = t || {}, this.renderer.render(this.parseInline(e, t), this.options, t);
};
/*! @license DOMPurify 3.3.3 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.3/LICENSE */
const {
  entries: Xo,
  setPrototypeOf: Li,
  isFrozen: qc,
  getPrototypeOf: Gc,
  getOwnPropertyDescriptor: Wc
} = Object;
let {
  freeze: Se,
  seal: We,
  create: nn
} = Object, {
  apply: vr,
  construct: xr
} = typeof Reflect < "u" && Reflect;
Se || (Se = function(t) {
  return t;
});
We || (We = function(t) {
  return t;
});
vr || (vr = function(t, u) {
  for (var r = arguments.length, i = new Array(r > 2 ? r - 2 : 0), n = 2; n < r; n++)
    i[n - 2] = arguments[n];
  return t.apply(u, i);
});
xr || (xr = function(t) {
  for (var u = arguments.length, r = new Array(u > 1 ? u - 1 : 0), i = 1; i < u; i++)
    r[i - 1] = arguments[i];
  return new t(...r);
});
const Qu = Le(Array.prototype.forEach), Zc = Le(Array.prototype.lastIndexOf), Ii = Le(Array.prototype.pop), mu = Le(Array.prototype.push), Vc = Le(Array.prototype.splice), rn = Le(String.prototype.toLowerCase), Jn = Le(String.prototype.toString), er = Le(String.prototype.match), gu = Le(String.prototype.replace), Xc = Le(String.prototype.indexOf), Yc = Le(String.prototype.trim), Be = Le(Object.prototype.hasOwnProperty), we = Le(RegExp.prototype.test), bu = Qc(TypeError);
function Le(e) {
  return function(t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var u = arguments.length, r = new Array(u > 1 ? u - 1 : 0), i = 1; i < u; i++)
      r[i - 1] = arguments[i];
    return vr(e, t, r);
  };
}
function Qc(e) {
  return function() {
    for (var t = arguments.length, u = new Array(t), r = 0; r < t; r++)
      u[r] = arguments[r];
    return xr(e, u);
  };
}
function X(e, t) {
  let u = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : rn;
  Li && Li(e, null);
  let r = t.length;
  for (; r--; ) {
    let i = t[r];
    if (typeof i == "string") {
      const n = u(i);
      n !== i && (qc(t) || (t[r] = n), i = n);
    }
    e[i] = !0;
  }
  return e;
}
function Kc(e) {
  for (let t = 0; t < e.length; t++)
    Be(e, t) || (e[t] = null);
  return e;
}
function lt(e) {
  const t = nn(null);
  for (const [u, r] of Xo(e))
    Be(e, u) && (Array.isArray(r) ? t[u] = Kc(r) : r && typeof r == "object" && r.constructor === Object ? t[u] = lt(r) : t[u] = r);
  return t;
}
function vu(e, t) {
  for (; e !== null; ) {
    const r = Wc(e, t);
    if (r) {
      if (r.get)
        return Le(r.get);
      if (typeof r.value == "function")
        return Le(r.value);
    }
    e = Gc(e);
  }
  function u() {
    return null;
  }
  return u;
}
const Oi = Se(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), tr = Se(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), ur = Se(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), Jc = Se(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), nr = Se(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), e0 = Se(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), Mi = Se(["#text"]), Ri = Se(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]), rr = Se(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), Bi = Se(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), Ku = Se(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), t0 = We(/\{\{[\w\W]*|[\w\W]*\}\}/gm), u0 = We(/<%[\w\W]*|[\w\W]*%>/gm), n0 = We(/\$\{[\w\W]*/gm), r0 = We(/^data-[\-\w.\u00B7-\uFFFF]+$/), i0 = We(/^aria-[\-\w]+$/), Yo = We(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), o0 = We(/^(?:\w+script|data):/i), a0 = We(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), Qo = We(/^html$/i), s0 = We(/^[a-z][.\w]*(-[.\w]+)+$/i);
var zi = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ARIA_ATTR: i0,
  ATTR_WHITESPACE: a0,
  CUSTOM_ELEMENT: s0,
  DATA_ATTR: r0,
  DOCTYPE_NAME: Qo,
  ERB_EXPR: u0,
  IS_ALLOWED_URI: Yo,
  IS_SCRIPT_OR_DATA: o0,
  MUSTACHE_EXPR: t0,
  TMPLIT_EXPR: n0
});
const xu = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
}, l0 = function() {
  return typeof window > "u" ? null : window;
}, c0 = function(t, u) {
  if (typeof t != "object" || typeof t.createPolicy != "function")
    return null;
  let r = null;
  const i = "data-tt-policy-suffix";
  u && u.hasAttribute(i) && (r = u.getAttribute(i));
  const n = "dompurify" + (r ? "#" + r : "");
  try {
    return t.createPolicy(n, {
      createHTML(o) {
        return o;
      },
      createScriptURL(o) {
        return o;
      }
    });
  } catch {
    return console.warn("TrustedTypes policy " + n + " could not be created."), null;
  }
}, Ni = function() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function Ko() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : l0();
  const t = (U) => Ko(U);
  if (t.version = "3.3.3", t.removed = [], !e || !e.document || e.document.nodeType !== xu.document || !e.Element)
    return t.isSupported = !1, t;
  let {
    document: u
  } = e;
  const r = u, i = r.currentScript, {
    DocumentFragment: n,
    HTMLTemplateElement: o,
    Node: a,
    Element: s,
    NodeFilter: c,
    NamedNodeMap: f = e.NamedNodeMap || e.MozNamedAttrMap,
    HTMLFormElement: l,
    DOMParser: d,
    trustedTypes: g
  } = e, p = s.prototype, C = vu(p, "cloneNode"), k = vu(p, "remove"), w = vu(p, "nextSibling"), v = vu(p, "childNodes"), b = vu(p, "parentNode");
  if (typeof o == "function") {
    const U = u.createElement("template");
    U.content && U.content.ownerDocument && (u = U.content.ownerDocument);
  }
  let A, y = "";
  const {
    implementation: E,
    createNodeIterator: D,
    createDocumentFragment: _,
    getElementsByTagName: H
  } = u, {
    importNode: G
  } = r;
  let P = Ni();
  t.isSupported = typeof Xo == "function" && typeof b == "function" && E && E.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: F,
    ERB_EXPR: L,
    TMPLIT_EXPR: B,
    DATA_ATTR: M,
    ARIA_ATTR: T,
    IS_SCRIPT_OR_DATA: $,
    ATTR_WHITESPACE: S,
    CUSTOM_ELEMENT: W
  } = zi;
  let {
    IS_ALLOWED_URI: J
  } = zi, Q = null;
  const fe = X({}, [...Oi, ...tr, ...ur, ...nr, ...Mi]);
  let ue = null;
  const Ie = X({}, [...Ri, ...rr, ...Bi, ...Ku]);
  let ee = Object.seal(nn(null, {
    tagNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: !1
    }
  })), gt = null, $t = null;
  const Re = Object.seal(nn(null, {
    tagCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    }
  }));
  let Hu = !0, cu = !0, Ut = !1, qt = !0, kt = !1, Gt = !0, Ze = !1, fu = !1, du = !1, bt = !1, $u = !1, Uu = !1, Xr = !0, Yr = !1;
  const Aa = "user-content-";
  let zn = !0, hu = !1, Wt = {}, ot = null;
  const Nn = X({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let Qr = null;
  const Kr = X({}, ["audio", "video", "img", "source", "image", "track"]);
  let Pn = null;
  const Jr = X({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), qu = "http://www.w3.org/1998/Math/MathML", Gu = "http://www.w3.org/2000/svg", vt = "http://www.w3.org/1999/xhtml";
  let Zt = vt, jn = !1, Hn = null;
  const ka = X({}, [qu, Gu, vt], Jn);
  let Wu = X({}, ["mi", "mo", "mn", "ms", "mtext"]), Zu = X({}, ["annotation-xml"]);
  const Ca = X({}, ["title", "style", "font", "a", "script"]);
  let pu = null;
  const _a = ["application/xhtml+xml", "text/html"], wa = "text/html";
  let pe = null, Vt = null;
  const Ea = u.createElement("form"), ei = function(x) {
    return x instanceof RegExp || x instanceof Function;
  }, $n = function() {
    let x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (!(Vt && Vt === x)) {
      if ((!x || typeof x != "object") && (x = {}), x = lt(x), pu = // eslint-disable-next-line unicorn/prefer-includes
      _a.indexOf(x.PARSER_MEDIA_TYPE) === -1 ? wa : x.PARSER_MEDIA_TYPE, pe = pu === "application/xhtml+xml" ? Jn : rn, Q = Be(x, "ALLOWED_TAGS") ? X({}, x.ALLOWED_TAGS, pe) : fe, ue = Be(x, "ALLOWED_ATTR") ? X({}, x.ALLOWED_ATTR, pe) : Ie, Hn = Be(x, "ALLOWED_NAMESPACES") ? X({}, x.ALLOWED_NAMESPACES, Jn) : ka, Pn = Be(x, "ADD_URI_SAFE_ATTR") ? X(lt(Jr), x.ADD_URI_SAFE_ATTR, pe) : Jr, Qr = Be(x, "ADD_DATA_URI_TAGS") ? X(lt(Kr), x.ADD_DATA_URI_TAGS, pe) : Kr, ot = Be(x, "FORBID_CONTENTS") ? X({}, x.FORBID_CONTENTS, pe) : Nn, gt = Be(x, "FORBID_TAGS") ? X({}, x.FORBID_TAGS, pe) : lt({}), $t = Be(x, "FORBID_ATTR") ? X({}, x.FORBID_ATTR, pe) : lt({}), Wt = Be(x, "USE_PROFILES") ? x.USE_PROFILES : !1, Hu = x.ALLOW_ARIA_ATTR !== !1, cu = x.ALLOW_DATA_ATTR !== !1, Ut = x.ALLOW_UNKNOWN_PROTOCOLS || !1, qt = x.ALLOW_SELF_CLOSE_IN_ATTR !== !1, kt = x.SAFE_FOR_TEMPLATES || !1, Gt = x.SAFE_FOR_XML !== !1, Ze = x.WHOLE_DOCUMENT || !1, bt = x.RETURN_DOM || !1, $u = x.RETURN_DOM_FRAGMENT || !1, Uu = x.RETURN_TRUSTED_TYPE || !1, du = x.FORCE_BODY || !1, Xr = x.SANITIZE_DOM !== !1, Yr = x.SANITIZE_NAMED_PROPS || !1, zn = x.KEEP_CONTENT !== !1, hu = x.IN_PLACE || !1, J = x.ALLOWED_URI_REGEXP || Yo, Zt = x.NAMESPACE || vt, Wu = x.MATHML_TEXT_INTEGRATION_POINTS || Wu, Zu = x.HTML_INTEGRATION_POINTS || Zu, ee = x.CUSTOM_ELEMENT_HANDLING || {}, x.CUSTOM_ELEMENT_HANDLING && ei(x.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (ee.tagNameCheck = x.CUSTOM_ELEMENT_HANDLING.tagNameCheck), x.CUSTOM_ELEMENT_HANDLING && ei(x.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (ee.attributeNameCheck = x.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), x.CUSTOM_ELEMENT_HANDLING && typeof x.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (ee.allowCustomizedBuiltInElements = x.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), kt && (cu = !1), $u && (bt = !0), Wt && (Q = X({}, Mi), ue = nn(null), Wt.html === !0 && (X(Q, Oi), X(ue, Ri)), Wt.svg === !0 && (X(Q, tr), X(ue, rr), X(ue, Ku)), Wt.svgFilters === !0 && (X(Q, ur), X(ue, rr), X(ue, Ku)), Wt.mathMl === !0 && (X(Q, nr), X(ue, Bi), X(ue, Ku))), Be(x, "ADD_TAGS") || (Re.tagCheck = null), Be(x, "ADD_ATTR") || (Re.attributeCheck = null), x.ADD_TAGS && (typeof x.ADD_TAGS == "function" ? Re.tagCheck = x.ADD_TAGS : (Q === fe && (Q = lt(Q)), X(Q, x.ADD_TAGS, pe))), x.ADD_ATTR && (typeof x.ADD_ATTR == "function" ? Re.attributeCheck = x.ADD_ATTR : (ue === Ie && (ue = lt(ue)), X(ue, x.ADD_ATTR, pe))), x.ADD_URI_SAFE_ATTR && X(Pn, x.ADD_URI_SAFE_ATTR, pe), x.FORBID_CONTENTS && (ot === Nn && (ot = lt(ot)), X(ot, x.FORBID_CONTENTS, pe)), x.ADD_FORBID_CONTENTS && (ot === Nn && (ot = lt(ot)), X(ot, x.ADD_FORBID_CONTENTS, pe)), zn && (Q["#text"] = !0), Ze && X(Q, ["html", "head", "body"]), Q.table && (X(Q, ["tbody"]), delete gt.tbody), x.TRUSTED_TYPES_POLICY) {
        if (typeof x.TRUSTED_TYPES_POLICY.createHTML != "function")
          throw bu('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof x.TRUSTED_TYPES_POLICY.createScriptURL != "function")
          throw bu('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        A = x.TRUSTED_TYPES_POLICY, y = A.createHTML("");
      } else
        A === void 0 && (A = c0(g, i)), A !== null && typeof y == "string" && (y = A.createHTML(""));
      Se && Se(x), Vt = x;
    }
  }, ti = X({}, [...tr, ...ur, ...Jc]), ui = X({}, [...nr, ...e0]), Fa = function(x) {
    let I = b(x);
    (!I || !I.tagName) && (I = {
      namespaceURI: Zt,
      tagName: "template"
    });
    const j = rn(x.tagName), se = rn(I.tagName);
    return Hn[x.namespaceURI] ? x.namespaceURI === Gu ? I.namespaceURI === vt ? j === "svg" : I.namespaceURI === qu ? j === "svg" && (se === "annotation-xml" || Wu[se]) : !!ti[j] : x.namespaceURI === qu ? I.namespaceURI === vt ? j === "math" : I.namespaceURI === Gu ? j === "math" && Zu[se] : !!ui[j] : x.namespaceURI === vt ? I.namespaceURI === Gu && !Zu[se] || I.namespaceURI === qu && !Wu[se] ? !1 : !ui[j] && (Ca[j] || !ti[j]) : !!(pu === "application/xhtml+xml" && Hn[x.namespaceURI]) : !1;
  }, at = function(x) {
    mu(t.removed, {
      element: x
    });
    try {
      b(x).removeChild(x);
    } catch {
      k(x);
    }
  }, Rt = function(x, I) {
    try {
      mu(t.removed, {
        attribute: I.getAttributeNode(x),
        from: I
      });
    } catch {
      mu(t.removed, {
        attribute: null,
        from: I
      });
    }
    if (I.removeAttribute(x), x === "is")
      if (bt || $u)
        try {
          at(I);
        } catch {
        }
      else
        try {
          I.setAttribute(x, "");
        } catch {
        }
  }, ni = function(x) {
    let I = null, j = null;
    if (du)
      x = "<remove></remove>" + x;
    else {
      const de = er(x, /^[\r\n\t ]+/);
      j = de && de[0];
    }
    pu === "application/xhtml+xml" && Zt === vt && (x = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + x + "</body></html>");
    const se = A ? A.createHTML(x) : x;
    if (Zt === vt)
      try {
        I = new d().parseFromString(se, pu);
      } catch {
      }
    if (!I || !I.documentElement) {
      I = E.createDocument(Zt, "template", null);
      try {
        I.documentElement.innerHTML = jn ? y : se;
      } catch {
      }
    }
    const ke = I.body || I.documentElement;
    return x && j && ke.insertBefore(u.createTextNode(j), ke.childNodes[0] || null), Zt === vt ? H.call(I, Ze ? "html" : "body")[0] : Ze ? I.documentElement : ke;
  }, ri = function(x) {
    return D.call(
      x.ownerDocument || x,
      x,
      // eslint-disable-next-line no-bitwise
      c.SHOW_ELEMENT | c.SHOW_COMMENT | c.SHOW_TEXT | c.SHOW_PROCESSING_INSTRUCTION | c.SHOW_CDATA_SECTION,
      null
    );
  }, Un = function(x) {
    return x instanceof l && (typeof x.nodeName != "string" || typeof x.textContent != "string" || typeof x.removeChild != "function" || !(x.attributes instanceof f) || typeof x.removeAttribute != "function" || typeof x.setAttribute != "function" || typeof x.namespaceURI != "string" || typeof x.insertBefore != "function" || typeof x.hasChildNodes != "function");
  }, ii = function(x) {
    return typeof a == "function" && x instanceof a;
  };
  function xt(U, x, I) {
    Qu(U, (j) => {
      j.call(t, x, I, Vt);
    });
  }
  const oi = function(x) {
    let I = null;
    if (xt(P.beforeSanitizeElements, x, null), Un(x))
      return at(x), !0;
    const j = pe(x.nodeName);
    if (xt(P.uponSanitizeElement, x, {
      tagName: j,
      allowedTags: Q
    }), Gt && x.hasChildNodes() && !ii(x.firstElementChild) && we(/<[/\w!]/g, x.innerHTML) && we(/<[/\w!]/g, x.textContent) || x.nodeType === xu.progressingInstruction || Gt && x.nodeType === xu.comment && we(/<[/\w]/g, x.data))
      return at(x), !0;
    if (!(Re.tagCheck instanceof Function && Re.tagCheck(j)) && (!Q[j] || gt[j])) {
      if (!gt[j] && si(j) && (ee.tagNameCheck instanceof RegExp && we(ee.tagNameCheck, j) || ee.tagNameCheck instanceof Function && ee.tagNameCheck(j)))
        return !1;
      if (zn && !ot[j]) {
        const se = b(x) || x.parentNode, ke = v(x) || x.childNodes;
        if (ke && se) {
          const de = ke.length;
          for (let Oe = de - 1; Oe >= 0; --Oe) {
            const yt = C(ke[Oe], !0);
            yt.__removalCount = (x.__removalCount || 0) + 1, se.insertBefore(yt, w(x));
          }
        }
      }
      return at(x), !0;
    }
    return x instanceof s && !Fa(x) || (j === "noscript" || j === "noembed" || j === "noframes") && we(/<\/no(script|embed|frames)/i, x.innerHTML) ? (at(x), !0) : (kt && x.nodeType === xu.text && (I = x.textContent, Qu([F, L, B], (se) => {
      I = gu(I, se, " ");
    }), x.textContent !== I && (mu(t.removed, {
      element: x.cloneNode()
    }), x.textContent = I)), xt(P.afterSanitizeElements, x, null), !1);
  }, ai = function(x, I, j) {
    if ($t[I] || Xr && (I === "id" || I === "name") && (j in u || j in Ea))
      return !1;
    if (!(cu && !$t[I] && we(M, I))) {
      if (!(Hu && we(T, I))) {
        if (!(Re.attributeCheck instanceof Function && Re.attributeCheck(I, x))) {
          if (!ue[I] || $t[I]) {
            if (
              // First condition does a very basic check if a) it's basically a valid custom element tagname AND
              // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
              !(si(x) && (ee.tagNameCheck instanceof RegExp && we(ee.tagNameCheck, x) || ee.tagNameCheck instanceof Function && ee.tagNameCheck(x)) && (ee.attributeNameCheck instanceof RegExp && we(ee.attributeNameCheck, I) || ee.attributeNameCheck instanceof Function && ee.attributeNameCheck(I, x)) || // Alternative, second condition checks if it's an `is`-attribute, AND
              // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              I === "is" && ee.allowCustomizedBuiltInElements && (ee.tagNameCheck instanceof RegExp && we(ee.tagNameCheck, j) || ee.tagNameCheck instanceof Function && ee.tagNameCheck(j)))
            ) return !1;
          } else if (!Pn[I]) {
            if (!we(J, gu(j, S, ""))) {
              if (!((I === "src" || I === "xlink:href" || I === "href") && x !== "script" && Xc(j, "data:") === 0 && Qr[x])) {
                if (!(Ut && !we($, gu(j, S, "")))) {
                  if (j)
                    return !1;
                }
              }
            }
          }
        }
      }
    }
    return !0;
  }, si = function(x) {
    return x !== "annotation-xml" && er(x, W);
  }, li = function(x) {
    xt(P.beforeSanitizeAttributes, x, null);
    const {
      attributes: I
    } = x;
    if (!I || Un(x))
      return;
    const j = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: ue,
      forceKeepAttr: void 0
    };
    let se = I.length;
    for (; se--; ) {
      const ke = I[se], {
        name: de,
        namespaceURI: Oe,
        value: yt
      } = ke, Xt = pe(de), qn = yt;
      let ye = de === "value" ? qn : Yc(qn);
      if (j.attrName = Xt, j.attrValue = ye, j.keepAttr = !0, j.forceKeepAttr = void 0, xt(P.uponSanitizeAttribute, x, j), ye = j.attrValue, Yr && (Xt === "id" || Xt === "name") && (Rt(de, x), ye = Aa + ye), Gt && we(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, ye)) {
        Rt(de, x);
        continue;
      }
      if (Xt === "attributename" && er(ye, "href")) {
        Rt(de, x);
        continue;
      }
      if (j.forceKeepAttr)
        continue;
      if (!j.keepAttr) {
        Rt(de, x);
        continue;
      }
      if (!qt && we(/\/>/i, ye)) {
        Rt(de, x);
        continue;
      }
      kt && Qu([F, L, B], (fi) => {
        ye = gu(ye, fi, " ");
      });
      const ci = pe(x.nodeName);
      if (!ai(ci, Xt, ye)) {
        Rt(de, x);
        continue;
      }
      if (A && typeof g == "object" && typeof g.getAttributeType == "function" && !Oe)
        switch (g.getAttributeType(ci, Xt)) {
          case "TrustedHTML": {
            ye = A.createHTML(ye);
            break;
          }
          case "TrustedScriptURL": {
            ye = A.createScriptURL(ye);
            break;
          }
        }
      if (ye !== qn)
        try {
          Oe ? x.setAttributeNS(Oe, de, ye) : x.setAttribute(de, ye), Un(x) ? at(x) : Ii(t.removed);
        } catch {
          Rt(de, x);
        }
    }
    xt(P.afterSanitizeAttributes, x, null);
  }, Da = function U(x) {
    let I = null;
    const j = ri(x);
    for (xt(P.beforeSanitizeShadowDOM, x, null); I = j.nextNode(); )
      xt(P.uponSanitizeShadowNode, I, null), oi(I), li(I), I.content instanceof n && U(I.content);
    xt(P.afterSanitizeShadowDOM, x, null);
  };
  return t.sanitize = function(U) {
    let x = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, I = null, j = null, se = null, ke = null;
    if (jn = !U, jn && (U = "<!-->"), typeof U != "string" && !ii(U))
      if (typeof U.toString == "function") {
        if (U = U.toString(), typeof U != "string")
          throw bu("dirty is not a string, aborting");
      } else
        throw bu("toString is not a function");
    if (!t.isSupported)
      return U;
    if (fu || $n(x), t.removed = [], typeof U == "string" && (hu = !1), hu) {
      if (U.nodeName) {
        const yt = pe(U.nodeName);
        if (!Q[yt] || gt[yt])
          throw bu("root node is forbidden and cannot be sanitized in-place");
      }
    } else if (U instanceof a)
      I = ni("<!---->"), j = I.ownerDocument.importNode(U, !0), j.nodeType === xu.element && j.nodeName === "BODY" || j.nodeName === "HTML" ? I = j : I.appendChild(j);
    else {
      if (!bt && !kt && !Ze && // eslint-disable-next-line unicorn/prefer-includes
      U.indexOf("<") === -1)
        return A && Uu ? A.createHTML(U) : U;
      if (I = ni(U), !I)
        return bt ? null : Uu ? y : "";
    }
    I && du && at(I.firstChild);
    const de = ri(hu ? U : I);
    for (; se = de.nextNode(); )
      oi(se), li(se), se.content instanceof n && Da(se.content);
    if (hu)
      return U;
    if (bt) {
      if ($u)
        for (ke = _.call(I.ownerDocument); I.firstChild; )
          ke.appendChild(I.firstChild);
      else
        ke = I;
      return (ue.shadowroot || ue.shadowrootmode) && (ke = G.call(r, ke, !0)), ke;
    }
    let Oe = Ze ? I.outerHTML : I.innerHTML;
    return Ze && Q["!doctype"] && I.ownerDocument && I.ownerDocument.doctype && I.ownerDocument.doctype.name && we(Qo, I.ownerDocument.doctype.name) && (Oe = "<!DOCTYPE " + I.ownerDocument.doctype.name + `>
` + Oe), kt && Qu([F, L, B], (yt) => {
      Oe = gu(Oe, yt, " ");
    }), A && Uu ? A.createHTML(Oe) : Oe;
  }, t.setConfig = function() {
    let U = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    $n(U), fu = !0;
  }, t.clearConfig = function() {
    Vt = null, fu = !1;
  }, t.isValidAttribute = function(U, x, I) {
    Vt || $n({});
    const j = pe(U), se = pe(x);
    return ai(j, se, I);
  }, t.addHook = function(U, x) {
    typeof x == "function" && mu(P[U], x);
  }, t.removeHook = function(U, x) {
    if (x !== void 0) {
      const I = Zc(P[U], x);
      return I === -1 ? void 0 : Vc(P[U], I, 1)[0];
    }
    return Ii(P[U]);
  }, t.removeHooks = function(U) {
    P[U] = [];
  }, t.removeAllHooks = function() {
    P = Ni();
  }, t;
}
var f0 = Ko();
const d0 = {
  content: {
    type: Object,
    required: !0
  }
}, h0 = new Ue({
  html: !0,
  linkify: !0
});
function p0(e) {
  const t = e.split(`
`), u = t.filter((i) => i.trim().length > 0);
  if (u.length === 0) return e.trim();
  const r = Math.min(...u.map((i) => {
    var n;
    return (((n = i.match(/^\s*/)) == null ? void 0 : n[0]) ?? "").length;
  }));
  return t.map((i) => i.slice(r)).join(`
`).trim();
}
const _u = /* @__PURE__ */ Y({
  name: "FXMarkdownMessage",
  props: d0,
  setup(e) {
    const t = N(() => {
      var n;
      const u = ((n = e.content) == null ? void 0 : n.content) ?? "", r = p0(u);
      if (!r) return "";
      const i = h0.render(r);
      return f0.sanitize(i, {
        ADD_TAGS: ["style"],
        ADD_ATTR: ["style", "align", "valign", "colspan", "rowspan", "scope", "title"]
      });
    });
    return () => {
      var r;
      const u = (r = e.content) == null ? void 0 : r.message;
      return h("div", {
        class: "f-chat-message-markdown"
      }, [u && h("div", {
        class: "f-chat-markdown-message"
      }, [u]), h("div", {
        class: "f-chat-markdown-content",
        innerHTML: t.value
      }, null)]);
    };
  }
}), Jo = /* @__PURE__ */ Y({
  name: "UserAuthMessage",
  props: {
    content: {
      type: Object,
      required: !0
    },
    onConfirm: {
      type: Function,
      default: void 0
    }
  },
  setup(e) {
    return () => h("div", {
      class: "f-ec-auth"
    }, [h("div", {
      class: "f-ec-auth-desc"
    }, [e.content.description]), h("div", {
      class: "f-ec-auth-actions"
    }, [e.content.options.map((t) => h("button", {
      key: t.optionId,
      type: "button",
      class: "f-ec-auth-btn",
      onClick: () => {
        var u;
        (u = e.onConfirm) == null || u.call(e, t.optionId, t.name, t.message ?? t.name), console.info("[UserAuth]", t.optionId, t.name);
      }
    }, [t.name]))])]);
  }
}), on = /* @__PURE__ */ Y({
  name: "FXBubble",
  components: {
    "fx-text-content": Ga,
    "fx-think": Va,
    "fx-thought-chain": rs,
    "fx-markdown-inline": _u,
    "fx-user-auth-inline": Jo,
    "fx-app-preview-inline": Cu
  },
  props: Ma,
  setup(e, t) {
    const u = Ru(), r = V(), i = V(), n = N(() => !!e.showAvatar), o = N(() => n.value === !0 || e.header === "ContentHeader"), a = N(() => t.slots.leftFooter || t.slots.rightFooter), s = N(() => {
      var F, L, B, M;
      return e.outputMode === "full" ? !0 : !(i != null && i.value && ((F = i.value) != null && F.localStartedTodo) && ((L = i.value) == null ? void 0 : L.thoughtChainState) !== "Done" || r != null && r.value && ((B = r.value) != null && B.localThinkContent) && ((M = r.value) == null ? void 0 : M.state) !== "completed");
    }), c = N(() => {
      var F;
      return Te({}, (F = e.styles) == null ? void 0 : F.footer);
    }), f = (F) => {
      if (e.onPreview) {
        if (F.type === "md" && F.content) {
          e.onPreview({
            content: F.content,
            contentType: "markdown"
          });
          return;
        }
        F != null && F.url && e.onPreview({
          url: F.url
        });
      }
    }, {
      renderAttachments: l
    } = Ao({
      attachments: e.attachments ?? [],
      onItemClick: f
    }), {
      renderFileEmbeddedContent: d,
      renderPageEmbeddedContent: g
    } = Ua(), p = V(""), C = N(() => {
      var L, B;
      if ((L = e.content) != null && L.footerContent)
        return e.content.footerContent;
      const F = (B = e.content) == null ? void 0 : B.structuredContent;
      return F && (F.footerTemplate || F.footerUrl || F.footerFile) ? {
        type: F.footerUrl ? "page" : F.footerFile ? "file" : "template",
        pageUrl: F.footerUrl,
        fileContent: F.footerFile,
        template: F.footerTemplate,
        width: F.footerWidth,
        height: F.footerHeight
      } : null;
    });
    ce(() => {
      var F;
      return (F = C.value) == null ? void 0 : F.width;
    }, (F) => {
      if (!F) {
        p.value = "";
        return;
      }
      if (F.endsWith("%")) {
        const L = parseFloat(F);
        isNaN(L) || nt(() => {
          var M, T;
          const B = (T = (M = u.value) == null ? void 0 : M.parentElement) == null ? void 0 : T.clientWidth;
          B && (p.value = `${B * L / 100}px`);
        });
      } else
        p.value = F;
    }, {
      immediate: !0
    });
    const k = (F) => {
      if (!F || F.length === 0) return "我";
      const L = F.charAt(0);
      return /[\u4e00-\u9fa5]/.test(L) ? L : L.toUpperCase();
    };
    function w() {
      return e.header === "ContentHeader" ? Ba : za;
    }
    const v = w(), {
      renderHeader: b
    } = v(e, t), A = () => {
      var B, M, T;
      const F = ((B = e.content) == null ? void 0 : B.sender) ?? "发送人", L = k(((M = e.content) == null ? void 0 : M.sender) ?? "");
      return h("div", {
        class: "f-chat-bubble-avatar"
      }, [(T = e.content) != null && T.avatar ? h("img", {
        src: e.content.avatar,
        alt: F
      }, null) : h("div", {
        class: "f-chat-bubble-avatar-initial"
      }, [L])]);
    }, y = (F) => {
      if (!(F != null && F.type)) return null;
      const {
        type: L
      } = F;
      return L === "page" && F.pageUrl ? g(F, {
        onNavigate: (B) => {
          var M;
          (M = e.onPreview) == null || M.call(e, {
            url: B
          });
        }
      }) : L === "file" && F.fileContent ? d(F, {
        onClickFile: f
      }) : L === "template" && F.template ? F.template() : null;
    }, E = () => {
      var M, T, $;
      if (!(($ = (T = (M = e.content) == null ? void 0 : M.structuredContent) == null ? void 0 : T.sections) != null && $.length)) return null;
      const {
        sections: F,
        showDivider: L
      } = e.content.structuredContent, B = (S) => {
        const {
          content: W,
          label: J
        } = S;
        return J || W && typeof W == "string" ? h(ut, null, [h("span", {
          class: "f-chat-bubble-structured-section-item-dot"
        }, null), S.label && h("span", {
          class: "f-chat-bubble-structured-section-item-label"
        }, [S.label]), h("span", {
          class: "f-chat-bubble-structured-section-item-content"
        }, [S.content])]) : y(S.content);
      };
      return h("div", {
        class: "f-chat-bubble-structured"
      }, [F.map((S, W) => h("div", {
        key: W,
        class: "f-chat-bubble-structured-section"
      }, [S.showDivider && h("div", {
        class: "f-chat-bubble-structured-divider"
      }, null), h("div", {
        class: "f-chat-bubble-structured-section-header"
      }, [S.icon && (S.icon.startsWith("http") || S.icon.startsWith("//") || S.icon.startsWith("../") || /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(S.icon) ? h("img", {
        alt: S.title,
        src: S.icon,
        class: "f-chat-bubble-structured-section-icon"
      }, null) : h("i", {
        class: `f-icon ${S.icon}`,
        style: S.iconStyle
      }, null)), h("span", {
        class: "f-chat-bubble-structured-section-title"
      }, [S.title])]), S.items && S.items.length > 0 && h("div", {
        class: "f-chat-bubble-structured-section-items"
      }, [S.items.map((J, Q) => h("div", {
        key: Q,
        class: "f-chat-bubble-structured-section-item"
      }, [B(J)]))]), S.showDivider && h("div", {
        class: "f-chat-bubble-structured-divider"
      }, null)])), L && h("div", {
        class: "f-chat-bubble-structured-divider"
      }, null)]);
    }, D = () => {
      const F = C.value;
      if (!F) return null;
      const L = {};
      return p.value && (L.width = p.value), F.height && (L.height = `${F.height}px`), h("div", {
        class: "f-chat-bubble-content-footer",
        style: L
      }, [y(F)]);
    }, _ = () => {
      var B, M;
      const F = ((B = e.content) == null ? void 0 : B.title) ?? "", L = ((M = e.content) == null ? void 0 : M.subtitle) ?? "";
      return h(ut, null, [F ? h("div", {
        class: "f-chat-bubble-content-title"
      }, [F]) : null, L ? h("div", {
        class: "f-chat-bubble-content-subtitle"
      }, [L]) : null]);
    }, H = () => {
      var L, B;
      const F = ((L = e.content) == null ? void 0 : L.text) ?? "";
      return F.trim() ? ((B = e.content) == null ? void 0 : B.textFormat) === "markdown" ? h(Bt("fx-markdown-inline"), {
        content: {
          type: "markdown",
          message: "",
          content: F
        }
      }, null) : h(Bt("fx-text-content"), {
        title: "",
        subtitle: "",
        text: F,
        outputMode: e.outputMode
      }, null) : null;
    }, G = () => {
      var L;
      const F = (L = e.content) == null ? void 0 : L.compositeInlineBlocks;
      return F != null && F.length ? F.map((B, M) => B.kind === "userAuth" ? h(Bt("fx-user-auth-inline"), {
        key: `inline-auth-${M}`,
        content: B.content,
        onConfirm: e.onUserAuthConfirm
      }, null) : h(Bt("fx-app-preview-inline"), {
        key: `inline-preview-${M}`,
        content: B.content,
        onOpen: e.onPreview
      }, null)) : null;
    }, P = () => {
      var F, L, B, M, T, $, S;
      return h("div", {
        class: `f-chat-bubble-content ${e.placement}`
      }, [o.value && b(), h("div", {
        class: `f-chat-bubble-content-text-wrapper ${e.placement}`
      }, [h(Bt("fx-think"), {
        ref: r,
        content: (F = e.content) == null ? void 0 : F.thinkingContent,
        onInit: e == null ? void 0 : e.onLoadThink,
        outputMode: e.outputMode
      }, null), h(Bt("fx-thought-chain"), {
        ref: i,
        content: (L = e.content) == null ? void 0 : L.startedTodo,
        onInit: e == null ? void 0 : e.onLoadThoughtChain
      }, null), s.value && h(ut, null, [E(), ((B = e.content) == null ? void 0 : B.textFormat) === "markdown" ? h(ut, null, [_(), H()]) : h(Bt("fx-text-content"), {
        title: ((M = e.content) == null ? void 0 : M.title) ?? "",
        subtitle: ((T = e.content) == null ? void 0 : T.subtitle) ?? "",
        text: (($ = e.content) == null ? void 0 : $.text) ?? "",
        outputMode: e.outputMode
      }, null), D()]), (S = e.compositeTailRender) == null ? void 0 : S.call(e), G()]), a.value && h("div", {
        class: "f-chat-bubble-footer",
        style: c.value
      }, [t.slots.leftFooter && h("div", {
        class: "f-chat-bubble-footer-left"
      }, [t.slots.leftFooter()]), t.slots.rightFooter && h("div", {
        class: "f-chat-bubble-footer-right"
      }, [t.slots.rightFooter()])]), l()]);
    };
    return () => h("div", {
      class: "f-chat-bubble-container",
      ref: u
    }, [h("div", {
      class: `f-chat-bubble-wrapper ${e.placement}`
    }, [e.placement === "start" ? h(ut, null, [n.value && A(), P()]) : h(ut, null, [P(), n.value && A()])])]);
  }
}), m0 = {
  /** 组件自定义样式类名 */
  customClass: { type: Object, default: "" },
  /** 组件自定义样式 */
  customStyle: { type: Object, default: "" }
}, Pi = /* @__PURE__ */ Y({
  name: "FXBubbleAction",
  props: m0,
  setup(e, t) {
    const u = N(() => Te({}, e.customStyle));
    return () => t.slots.default && h("span", {
      class: "f-chat-bubble-footer-action",
      style: u.value
    }, [t.slots.default()]);
  }
});
on.install = (e) => {
  e.component(on.name, on), e.component(Pi.name, Pi);
};
const g0 = {
  /** 轮播项列表 */
  items: {
    type: Array,
    default: () => []
  },
  /** 当前激活索引（受控） */
  modelValue: {
    type: Number,
    default: 0
  },
  /** 轮播方向 */
  direction: {
    type: String,
    default: "horizontal"
  },
  /** 是否自动播放 */
  autoplay: {
    type: Boolean,
    default: !1
  },
  /** 自动播放间隔（ms） */
  interval: {
    type: Number,
    default: 3e3
  },
  /** 是否循环 */
  loop: {
    type: Boolean,
    default: !0
  },
  /** 触发方式 */
  trigger: {
    type: String,
    default: "click"
  },
  /** 指示器位置 */
  indicatorPosition: {
    type: String,
    default: "inside"
  },
  /** 箭头显示时机 */
  arrowVisibility: {
    type: String,
    default: "hover"
  },
  /** 是否显示指示器 */
  showIndicator: {
    type: Boolean,
    default: !0
  },
  /** 是否显示箭头 */
  showArrow: {
    type: Boolean,
    default: !0
  },
  showInfo: {
    type: Boolean,
    default: !0
  },
  /** 高度 */
  height: {
    type: [String, Number],
    default: "400px"
  },
  /** 自定义样式 */
  styles: {
    type: Object,
    default: () => ({})
  },
  /** 自定义样式类名 */
  classNames: {
    type: Object,
    default: () => ({})
  },
  /** 组件自定义样式类名 */
  customClass: {
    type: [String, Array, Object],
    default: ""
  },
  /** 组件自定义样式 */
  customStyle: {
    type: [Object, String],
    default: ""
  },
  buttonPosition: {
    type: String,
    default: "inner"
  }
}, b0 = {
  /** 轮播项数据 */
  item: {
    type: Object,
    default: () => ({})
  },
  /** 索引 */
  index: {
    type: Number,
    default: 0
  },
  /** 是否激活 */
  active: {
    type: Boolean,
    default: !1
  },
  showInfo: {
    type: Boolean,
    default: !0
  },
  /** 自定义样式 */
  styles: {
    type: Object,
    default: () => ({})
  },
  /** 自定义样式类名 */
  classNames: {
    type: Object,
    default: () => ({})
  }
}, yr = /* @__PURE__ */ Y({
  name: "FXCarouselItem",
  props: b0,
  emits: ["click"],
  setup(e, {
    slots: t,
    emit: u
  }) {
    const r = N(() => {
      var l;
      const f = {
        "fx-carousel--item": !0,
        "fx-carousel--item-active": e.active
      };
      return De(f, (l = e.classNames) == null ? void 0 : l.item);
    }), i = N(() => {
      var l, d;
      const f = Te({}, (l = e.styles) == null ? void 0 : l.item);
      return Te(f, (d = e.styles) == null ? void 0 : d.item);
    }), n = () => {
      var f, l, d;
      return e.item.image ? h("img", {
        class: ["fx-carousel--item-image", (f = e.classNames) == null ? void 0 : f.image],
        style: (l = e.styles) == null ? void 0 : l.image,
        src: e.item.image,
        alt: (d = e.item.title) == null ? void 0 : d.toString()
      }, null) : null;
    }, o = () => {
      var f, l, d, g;
      return e.item.content ? h("div", {
        class: ["fx-carousel--item-content", (f = e.classNames) == null ? void 0 : f.content],
        style: (l = e.styles) == null ? void 0 : l.content
      }, [e.item.content]) : t.default ? h("div", {
        class: ["fx-carousel--item-content", (d = e.classNames) == null ? void 0 : d.content],
        style: (g = e.styles) == null ? void 0 : g.content
      }, [t.default()]) : null;
    }, a = () => {
      var f, l;
      return e.item.title ? h("h3", {
        class: ["fx-carousel--item-title", (f = e.classNames) == null ? void 0 : f.title],
        style: (l = e.styles) == null ? void 0 : l.title
      }, [e.item.title]) : null;
    }, s = () => {
      var f, l;
      return e.item.description ? h("p", {
        class: ["fx-carousel--item-description", (f = e.classNames) == null ? void 0 : f.description],
        style: (l = e.styles) == null ? void 0 : l.description
      }, [e.item.description]) : null;
    }, c = (f) => {
      e.item.disabled || u("click", f, e.item, e.index);
    };
    return () => h("div", {
      class: r.value,
      style: i.value,
      onClick: c
    }, [n(), o(), e.showInfo && h("div", {
      class: "fx-carousel--item-info"
    }, [a(), s()])]);
  }
});
function v0(e) {
  const {
    items: t,
    autoplay: u = !1,
    interval: r = 3e3,
    loop: i = !0,
    direction: n = "horizontal"
  } = e, o = V(0), a = V(!1), s = V(null), c = N(() => t.length), f = N(() => c.value <= 1);
  N(() => o.value === 0 ? i ? c.value - 1 : 0 : o.value - 1), N(() => o.value === c.value - 1 ? i ? 0 : o.value : o.value + 1);
  const l = N(() => {
    const b = -o.value * 100;
    return {
      transform: n === "horizontal" ? `translateX(${b}%)` : `translateY(${b}%)`,
      transition: "transform 0.5s ease"
    };
  }), d = (b) => {
    b < 0 || b >= c.value || (o.value, o.value = b);
  }, g = () => {
    f.value || (o.value === c.value - 1 ? d(i ? 0 : o.value) : d(o.value + 1));
  }, p = () => {
    f.value || (o.value === 0 ? d(i ? c.value - 1 : 0) : d(o.value - 1));
  }, C = () => {
    !u || f.value || (k(), s.value = window.setInterval(() => {
      a.value || g();
    }, r));
  }, k = () => {
    s.value && (clearInterval(s.value), s.value = null);
  }, w = () => {
    a.value = !0, u && k();
  }, v = () => {
    a.value = !1, u && C();
  };
  return _e(() => {
    C();
  }), Or(() => {
    k();
  }), {
    currentIndex: o,
    totalItems: c,
    isSingleItem: f,
    trackStyle: l,
    goTo: d,
    next: g,
    prev: p,
    handleMouseEnter: w,
    handleMouseLeave: v
  };
}
const an = /* @__PURE__ */ Y({
  name: "FXCarousel",
  props: g0,
  emits: ["update:modelValue", "change", "item-click"],
  setup(e, {
    slots: t,
    emit: u
  }) {
    const {
      currentIndex: r,
      isSingleItem: i,
      trackStyle: n,
      goTo: o,
      next: a,
      prev: s,
      handleMouseEnter: c,
      handleMouseLeave: f
    } = v0({
      items: e.items,
      autoplay: e.autoplay,
      interval: e.interval,
      loop: e.loop,
      direction: e.direction
    }), l = (y) => {
      u("update:modelValue", y), u("change", y, r.value);
    }, d = N(() => {
      var E;
      const y = {
        "fx-carousel": !0,
        "fx-carousel--vertical": e.direction === "vertical",
        "fx-carousel--single": i.value,
        "fx-carousel--button-outer": e.buttonPosition === "outer",
        "fx-carousel--button-inner": e.buttonPosition === "inner"
      };
      return De(y, (E = e.classNames) == null ? void 0 : E.root);
    }), g = N(() => {
      var D;
      const y = {
        height: typeof e.height == "number" ? `${e.height}px` : e.height
      }, E = Te(y, e.customStyle);
      return Te(E, (D = e.styles) == null ? void 0 : D.root);
    }), p = N(() => {
      var E;
      const y = {
        "fx-carousel--container": !0,
        "fx-carousel--container-hover": e.arrowVisibility === "hover"
      };
      return De(y, (E = e.classNames) == null ? void 0 : E.container);
    }), C = N(() => {
      var E;
      return De({
        "fx-carousel--track": !0
      }, (E = e.classNames) == null ? void 0 : E.track);
    }), k = N(() => {
      var E;
      const y = {
        "fx-carousel--indicator": !0,
        "fx-carousel--indicator-outside": e.indicatorPosition === "outside",
        "fx-carousel--indicator-none": e.indicatorPosition === "none" || !e.showIndicator
      };
      return De(y, (E = e.classNames) == null ? void 0 : E.indicator);
    }), w = (y) => {
      var D, _;
      const E = {
        "fx-carousel--arrow": !0,
        "fx-carousel--arrow-left": y === "left",
        "fx-carousel--arrow-right": y === "right",
        "fx-carousel--arrow-never": e.arrowVisibility === "never" || !e.showArrow
      };
      return E[`fx-carousel--arrow-${e.buttonPosition}`] = !0, De(E, y === "left" ? (D = e.classNames) == null ? void 0 : D.arrowLeft : (_ = e.classNames) == null ? void 0 : _.arrowRight);
    }, v = (y) => {
      var _, H;
      if (i.value) return null;
      const E = y === "left" ? s : a, D = t[y === "left" ? "prevArrow" : "nextArrow"];
      return h("button", {
        class: w(y),
        style: y === "left" ? (_ = e.styles) == null ? void 0 : _.arrowLeft : (H = e.styles) == null ? void 0 : H.arrowRight,
        onClick: E,
        "aria-label": `${y} arrow`
      }, [D ? D() : h("i", {
        style: "font-size: 60px;",
        class: `f-icon f-icon-arrow-chevron-${y === "left" ? "left" : "right"}`
      }, null)]);
    }, b = () => {
      var y;
      return i.value || !e.showIndicator ? null : h("div", {
        class: k.value,
        style: (y = e.styles) == null ? void 0 : y.indicator
      }, [e.items.map((E, D) => {
        var _, H;
        return h("button", {
          "aria-label": `indicator ${D}`,
          key: D,
          class: ["fx-carousel--indicator-item", {
            "fx-carousel--indicator-item-active": D === r.value
          }],
          style: D === r.value ? (_ = e.styles) == null ? void 0 : _.indicatorItemActive : (H = e.styles) == null ? void 0 : H.indicatorItem,
          onClick: () => {
            o(D), l(D);
          }
        }, null);
      })]);
    }, A = () => h("div", {
      class: C.value,
      style: n.value
    }, [e.items.map((y, E) => h(yr, {
      key: y.id || `item_${E}`,
      item: y,
      showInfo: e.showInfo,
      index: E,
      active: E === r.value,
      styles: e.styles,
      classNames: e.classNames,
      onClick: (D, _, H) => {
        u("item-click", D, _, H);
      }
    }, {
      default: () => {
        var D, _;
        return [(D = t.item) == null ? void 0 : D.call(t, {
          item: y,
          index: E,
          active: E === r.value
        }), (_ = t[`item${E}`]) == null ? void 0 : _.call(t, {
          item: y,
          index: E,
          active: E === r.value
        })];
      }
    }))]);
    return () => {
      var y;
      return h("div", {
        class: d.value,
        style: g.value,
        onMouseenter: c,
        onMouseleave: f
      }, [e.buttonPosition === "outer" && v("left"), h("div", {
        class: p.value,
        style: (y = e.styles) == null ? void 0 : y.container
      }, [e.buttonPosition === "inner" && v("left"), A(), e.buttonPosition === "inner" && v("right")]), e.buttonPosition === "outer" && v("right"), b()]);
    };
  }
});
an.install = (e) => {
  e.component(an.name, an), e.component(yr.name, yr);
};
const x0 = {
  previewConfig: {
    type: Object,
    default: () => ({})
  },
  onClose: {
    type: Function,
    default: () => {
    }
  }
}, y0 = {
  content: { type: String, default: null }
}, A0 = (e) => {
  const t = typeof e;
  return t !== "function" && t !== "object" || e === null;
}, k0 = (e) => {
  const t = e.flags === "" ? void 0 : e.flags;
  return new RegExp(e.source, t);
}, yu = (e, t = /* @__PURE__ */ new WeakMap()) => {
  if (e === null || A0(e))
    return e;
  if (t.has(e))
    return t.get(e);
  if (e instanceof RegExp)
    return k0(e);
  if (e instanceof Date)
    return new Date(e.getTime());
  if (e instanceof Function)
    return e;
  if (e instanceof Map) {
    const r = /* @__PURE__ */ new Map();
    return t.set(e, r), e.forEach((i, n) => {
      r.set(n, yu(i, t));
    }), r;
  }
  if (e instanceof Set) {
    const r = /* @__PURE__ */ new Set();
    t.set(e, r);
    for (const i of e)
      r.add(yu(i, t));
    return r;
  }
  if (Array.isArray(e)) {
    const r = [];
    return t.set(e, r), e.forEach((i) => {
      r.push(yu(i, t));
    }), r;
  }
  const u = {};
  t.set(e, u);
  for (const r in e)
    Object.prototype.hasOwnProperty.call(e, r) && (u[r] = yu(e[r], t));
  return u;
}, C0 = (e, t = 200) => {
  let u = 0;
  return (...r) => new Promise((i) => {
    u && (clearTimeout(u), i("cancel")), u = window.setTimeout(() => {
      e.apply(void 0, r), u = 0, i("done");
    }, t);
  });
}, Ar = () => `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`, Dn = (e) => e !== null && typeof e == "object" && !Array.isArray(e), _0 = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]), w0 = (e) => !_0.has(e), Zr = (e, t, u = {}) => {
  if (Array.isArray(e) && Array.isArray(t))
    return kr(e, t, u);
  const { excludeKeys: r } = u, i = e, n = t;
  for (const o of Object.keys(n)) {
    if (!w0(o))
      continue;
    const a = n[o], s = i[o];
    r && r(o) ? i[o] = a : Array.isArray(a) && Array.isArray(s) ? i[o] = kr(s, a, u) : Dn(a) && Dn(s) ? i[o] = Zr(
      s,
      a,
      u
    ) : i[o] = a;
  }
  return e;
}, kr = (e, t, u) => {
  const r = e.slice();
  return t.forEach((i, n) => {
    const o = r[n];
    Array.isArray(i) && Array.isArray(o) ? r[n] = kr(o, i, u) : Dn(i) && Dn(o) ? r[n] = Zr(
      o,
      i,
      u
    ) : r[n] = i;
  }), r;
}, R = "md-editor", ne = "https://unpkg.com", E0 = `${ne}/@highlightjs/cdn-assets@11.11.1/highlight.min.js`, ji = {
  main: `${ne}/prettier@3.8.1/standalone.js`,
  markdown: `${ne}/prettier@3.8.1/plugins/markdown.js`
}, F0 = {
  css: `${ne}/cropperjs@1.6.2/dist/cropper.min.css`,
  js: `${ne}/cropperjs@1.6.2/dist/cropper.min.js`
}, D0 = `${ne}/screenfull@5.2.0/dist/screenfull.js`, T0 = `${ne}/mermaid@11.12.3/dist/mermaid.min.js`, S0 = {
  js: `${ne}/katex@0.16.33/dist/katex.min.js`,
  css: `${ne}/katex@0.16.33/dist/katex.min.css`
}, Cr = {
  a11y: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/a11y-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/a11y-dark.min.css`
  },
  atom: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/atom-one-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/atom-one-dark.min.css`
  },
  github: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/github.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/github-dark.min.css`
  },
  gradient: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/gradient-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/gradient-dark.min.css`
  },
  kimbie: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/kimbie-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/kimbie-dark.min.css`
  },
  paraiso: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/paraiso-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/paraiso-dark.min.css`
  },
  qtcreator: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/qtcreator-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/qtcreator-dark.min.css`
  },
  stackoverflow: {
    light: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/stackoverflow-light.min.css`,
    dark: `${ne}/@highlightjs/cdn-assets@11.11.1/styles/stackoverflow-dark.min.css`
  }
}, L0 = `${ne}/echarts@6.0.0/dist/echarts.min.js`, Hi = {
  "zh-CN": {
    toolbarTips: {
      bold: "加粗",
      underline: "下划线",
      italic: "斜体",
      strikeThrough: "删除线",
      title: "标题",
      sub: "下标",
      sup: "上标",
      quote: "引用",
      unorderedList: "无序列表",
      orderedList: "有序列表",
      task: "任务列表",
      codeRow: "行内代码",
      code: "块级代码",
      link: "链接",
      image: "图片",
      table: "表格",
      mermaid: "mermaid图",
      katex: "katex公式",
      revoke: "后退",
      next: "前进",
      save: "保存",
      prettier: "美化",
      pageFullscreen: "浏览器全屏",
      fullscreen: "屏幕全屏",
      preview: "预览",
      previewOnly: "仅预览",
      htmlPreview: "html代码预览",
      catalog: "目录",
      github: "源码地址"
    },
    titleItem: {
      h1: "一级标题",
      h2: "二级标题",
      h3: "三级标题",
      h4: "四级标题",
      h5: "五级标题",
      h6: "六级标题"
    },
    imgTitleItem: {
      link: "添加链接",
      upload: "上传图片",
      clip2upload: "裁剪上传"
    },
    linkModalTips: {
      linkTitle: "添加链接",
      imageTitle: "添加图片",
      descLabel: "链接描述：",
      descLabelPlaceHolder: "请输入描述...",
      urlLabel: "链接地址：",
      urlLabelPlaceHolder: "请输入链接...",
      buttonOK: "确定"
    },
    clipModalTips: {
      title: "裁剪图片上传",
      buttonUpload: "上传"
    },
    copyCode: {
      text: "复制代码",
      successTips: "已复制！",
      failTips: "复制失败！"
    },
    mermaid: {
      flow: "流程图",
      sequence: "时序图",
      gantt: "甘特图",
      class: "类图",
      state: "状态图",
      pie: "饼图",
      relationship: "关系图",
      journey: "旅程图"
    },
    katex: {
      inline: "行内公式",
      block: "块级公式"
    },
    footer: {
      markdownTotal: "字数",
      scrollAuto: "同步滚动"
    }
  },
  "en-US": {
    toolbarTips: {
      bold: "bold",
      underline: "underline",
      italic: "italic",
      strikeThrough: "strikeThrough",
      title: "title",
      sub: "subscript",
      sup: "superscript",
      quote: "quote",
      unorderedList: "unordered list",
      orderedList: "ordered list",
      task: "task list",
      codeRow: "inline code",
      code: "block-level code",
      link: "link",
      image: "image",
      table: "table",
      mermaid: "mermaid",
      katex: "formula",
      revoke: "revoke",
      next: "undo revoke",
      save: "save",
      prettier: "prettier",
      pageFullscreen: "fullscreen in page",
      fullscreen: "fullscreen",
      preview: "preview",
      previewOnly: "preview only",
      htmlPreview: "html preview",
      catalog: "catalog",
      github: "source code"
    },
    titleItem: {
      h1: "Lv1 Heading",
      h2: "Lv2 Heading",
      h3: "Lv3 Heading",
      h4: "Lv4 Heading",
      h5: "Lv5 Heading",
      h6: "Lv6 Heading"
    },
    imgTitleItem: {
      link: "Add Image Link",
      upload: "Upload Images",
      clip2upload: "Crop And Upload"
    },
    linkModalTips: {
      linkTitle: "Add Link",
      imageTitle: "Add Image",
      descLabel: "Desc:",
      descLabelPlaceHolder: "Enter a description...",
      urlLabel: "Link:",
      urlLabelPlaceHolder: "Enter a link...",
      buttonOK: "OK"
    },
    clipModalTips: {
      title: "Crop Image",
      buttonUpload: "Upload"
    },
    copyCode: {
      text: "Copy",
      successTips: "Copied!",
      failTips: "Copy failed!"
    },
    mermaid: {
      flow: "flow",
      sequence: "sequence",
      gantt: "gantt",
      class: "class",
      state: "state",
      pie: "pie",
      relationship: "relationship",
      journey: "journey"
    },
    katex: {
      inline: "inline",
      block: "block"
    },
    footer: {
      markdownTotal: "Character Count",
      scrollAuto: "Scroll Auto"
    }
  }
}, rt = {
  editorExtensions: {
    highlight: {
      js: E0,
      css: Cr
    },
    prettier: {
      standaloneJs: ji.main,
      parserMarkdownJs: ji.markdown
    },
    cropper: {
      ...F0
    },
    screenfull: {
      js: D0
    },
    mermaid: {
      js: T0,
      enableZoom: !0
    },
    katex: {
      ...S0
    },
    echarts: {
      js: L0
    }
  },
  editorExtensionsAttrs: {},
  editorConfig: {
    languageUserDefined: {},
    mermaidTemplate: {},
    renderDelay: 500,
    zIndex: 2e4
  },
  codeMirrorExtensions: (e) => e,
  markdownItConfig: () => {
  },
  markdownItPlugins: (e) => e,
  mermaidConfig: (e) => e,
  katexConfig: (e) => e,
  echartsConfig: (e) => e
}, I0 = ({
  instance: e,
  ctx: t,
  props: u = {}
}, r = "default") => {
  const i = (e == null ? void 0 : e.$slots[r]) || (t == null ? void 0 : t.slots[r]);
  return (i ? i(e) : "") || u[r];
}, O0 = "buildFinished", _r = "errorCatcher", ir = "catalogChanged", M0 = "pushCatalog", ea = "rerender", R0 = "taskStateChanged";
class B0 {
  constructor() {
    // 事件池
    ie(this, "pools", {});
  }
  // 移除事件监听
  remove(t, u, r) {
    const i = this.pools[t] && this.pools[t][u];
    i && (this.pools[t][u] = i.filter((n) => n !== r));
  }
  // 清空全部事件，由于单一实例，多次注册会被共享内容
  clear(t) {
    this.pools[t] = {};
  }
  // 注册事件监听
  on(t, u) {
    return this.pools[t] || (this.pools[t] = {}), this.pools[t][u.name] || (this.pools[t][u.name] = []), this.pools[t][u.name].push(u.callback), this.pools[t][u.name].includes(u.callback);
  }
  // 触发事件
  emit(t, u, ...r) {
    this.pools[t] || (this.pools[t] = {});
    const i = this.pools[t][u];
    i && i.forEach((n) => {
      try {
        n(...r);
      } catch (o) {
        console.error(`${u} monitor event exception！`, o);
      }
    });
  }
}
const Ge = new B0(), z0 = (e, t) => {
  if (!e)
    return e;
  const u = t.split(`
`), r = ['<span rn-wrapper aria-hidden="true">'];
  return u.forEach(() => {
    r.push("<span></span>");
  }), r.push("</span>"), `<span class="${R}-code-block">${e}</span>${r.join("")}`;
};
async function ta(e) {
  if (typeof e == "string") {
    if (window.isSecureContext && navigator.clipboard)
      return await navigator.clipboard.writeText(e);
    {
      const t = document.createElement("textarea");
      let u = !1;
      if (t.value = e, t.style.position = "fixed", t.style.opacity = 0, t.style.zIndex = "-10000", t.style.top = "-10000", document.body.appendChild(t), t.select(), u = document.execCommand("copy"), document.body.removeChild(t), u)
        return;
      throw new Error('Failed to copy content via "execCommand"!');
    }
  }
}
const N0 = {
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy ${R}-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  "collapse-tips": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-chevron-left ${R}-icon"><circle cx="12" cy="12" r="10"/><path d="m14 16-4-4 4-4"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin ${R}-icon"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
  "pin-off": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-off ${R}-icon"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check ${R}-icon"><path d="M20 6 9 17l-5-5"/></svg>`
}, ct = (e, t) => typeof t[e] == "string" ? t[e] : N0[e], Mt = (e, t, u = "") => {
  var i;
  const r = document.getElementById(t.id);
  if (r)
    u !== "" && (Reflect.get(window, u) ? (i = t.onload) == null || i.call(r, new Event("load")) : t.onload && r.addEventListener("load", t.onload));
  else {
    const n = { ...t };
    n.onload = null;
    const o = j0(e, n);
    t.onload && o.addEventListener("load", t.onload), document.head.appendChild(o);
  }
}, P0 = (e, t) => {
  var u;
  (u = document.getElementById(t.id)) == null || u.remove(), Mt(e, t);
}, j0 = (e, t) => {
  const u = document.createElement(e);
  return Object.keys(t).forEach((r) => {
    t[r] !== void 0 && (u[r] = t[r]);
  }), u;
}, H0 = (e, t) => {
  const u = /* @__PURE__ */ new Map();
  return e == null || e.forEach((r) => {
    let i = r.querySelector(`.${R}-mermaid-action`);
    i ? i.querySelector(`.${R}-mermaid-copy`) || i.insertAdjacentHTML(
      "beforeend",
      `<span class="${R}-mermaid-copy">${ct("copy", t.customIcon)}</span>`
    ) : (r.insertAdjacentHTML(
      "beforeend",
      `<div class="${R}-mermaid-action"><span class="${R}-mermaid-copy">${ct("copy", t.customIcon)}</span></div>`
    ), i = r.querySelector(`.${R}-mermaid-action`));
    const n = i.querySelector(`.${R}-mermaid-copy`);
    let o = -1;
    const a = () => {
      clearTimeout(o), ta(r.dataset.content || "").then(() => {
        n.innerHTML = ct("check", t.customIcon);
      }).catch(() => {
        n.innerHTML = ct("copy", t.customIcon);
      }).finally(() => {
        o = window.setTimeout(() => {
          n.innerHTML = ct("copy", t.customIcon);
        }, 1500);
      });
    };
    n.addEventListener("click", a), u.set(r, {
      removeClick: () => {
        n.removeEventListener("click", a);
      }
    });
  }), () => {
    u.forEach(({ removeClick: r }) => {
      r == null || r();
    }), u.clear();
  };
}, $0 = /* @__PURE__ */ (() => {
  const e = (t) => {
    if (!t)
      return () => {
      };
    const u = t.firstChild;
    let r = 1, i = 0, n = 0, o = !1, a, s, c, f = 1;
    const l = () => {
      u.style.transform = `translate(${i}px, ${n}px) scale(${r})`;
    }, d = (A) => {
      A.touches.length === 1 ? (o = !0, a = A.touches[0].clientX - i, s = A.touches[0].clientY - n) : A.touches.length === 2 && (c = Math.hypot(
        A.touches[0].clientX - A.touches[1].clientX,
        A.touches[0].clientY - A.touches[1].clientY
      ), f = r);
    }, g = (A) => {
      if (A.preventDefault(), o && A.touches.length === 1)
        i = A.touches[0].clientX - a, n = A.touches[0].clientY - s, l();
      else if (A.touches.length === 2) {
        const y = Math.hypot(
          A.touches[0].clientX - A.touches[1].clientX,
          A.touches[0].clientY - A.touches[1].clientY
        ) / c, E = r;
        r = f * (1 + (y - 1));
        const D = (A.touches[0].clientX + A.touches[1].clientX) / 2, _ = (A.touches[0].clientY + A.touches[1].clientY) / 2, H = u.getBoundingClientRect(), G = (D - H.left) / E, P = (_ - H.top) / E;
        i -= G * (r - E), n -= P * (r - E), l();
      }
    }, p = () => {
      o = !1;
    }, C = (A) => {
      A.preventDefault();
      const y = 0.02, E = r;
      A.deltaY < 0 ? r += y : r = Math.max(0.1, r - y);
      const D = u.getBoundingClientRect(), _ = A.clientX - D.left, H = A.clientY - D.top;
      i -= _ / E * (r - E), n -= H / E * (r - E), l();
    }, k = (A) => {
      o = !0, a = A.clientX - i, s = A.clientY - n;
    }, w = (A) => {
      o && (i = A.clientX - a, n = A.clientY - s, l());
    }, v = () => {
      o = !1;
    }, b = () => {
      o = !1;
    };
    return t.addEventListener("touchstart", d, { passive: !1 }), t.addEventListener("touchmove", g, { passive: !1 }), t.addEventListener("touchend", p), t.addEventListener("wheel", C, { passive: !1 }), t.addEventListener("mousedown", k), t.addEventListener("mousemove", w), t.addEventListener("mouseup", v), t.addEventListener("mouseleave", b), () => {
      t.removeEventListener("touchstart", d), t.removeEventListener("touchmove", g), t.removeEventListener("touchend", p), t.removeEventListener("wheel", C), t.removeEventListener("mousedown", k), t.removeEventListener("mousemove", w), t.removeEventListener("mouseup", v), t.removeEventListener("mouseleave", b);
    };
  };
  return (t, u) => {
    const r = /* @__PURE__ */ new Map();
    return t == null || t.forEach((i) => {
      let n = i.querySelector(`.${R}-mermaid-action`);
      n ? n.querySelector(`.${R}-mermaid-zoom`) || n.insertAdjacentHTML(
        "beforeend",
        `<span class="${R}-mermaid-zoom">${ct("pin-off", u.customIcon)}</span>`
      ) : (i.insertAdjacentHTML(
        "beforeend",
        `<div class="${R}-mermaid-action"><span class="${R}-mermaid-zoom">${ct("pin-off", u.customIcon)}</span></div>`
      ), n = i.querySelector(`.${R}-mermaid-action`));
      const o = n.querySelector(`.${R}-mermaid-zoom`), a = () => {
        const s = r.get(i);
        if (s != null && s.removeEvent)
          s.removeEvent(), i.removeAttribute("data-grab"), r.set(i, { removeClick: s.removeClick }), o.innerHTML = ct("pin-off", u.customIcon);
        else {
          const c = e(i);
          i.setAttribute("data-grab", ""), r.set(i, { removeEvent: c, removeClick: s == null ? void 0 : s.removeClick }), o.innerHTML = ct("pin", u.customIcon);
        }
      };
      o.addEventListener("click", a), r.set(i, {
        removeClick: () => o.removeEventListener("click", a)
      });
    }), () => {
      r.forEach(({ removeEvent: i, removeClick: n }) => {
        i == null || i(), n == null || n();
      }), r.clear();
    };
  };
})(), $i = /* @__PURE__ */ new Set([!0, !1, "alt", "title"]);
function ua(e, t) {
  return (Array.isArray(e) ? e : []).filter(([u]) => u !== t);
}
function na(e, t) {
  e && e.attrs && (e.attrs = ua(e.attrs, t));
}
function U0(e, t) {
  if (!$i.has(e)) throw new TypeError(`figcaption must be one of: ${[...$i]}.`);
  if (e === "alt") return t.content;
  const u = t.attrs.find(([r]) => r === "title");
  return Array.isArray(u) && u[1] ? (na(t, "title"), u[1]) : void 0;
}
function q0(e, t) {
  t = t || {}, e.core.ruler.before("linkify", "image_figures", function(u) {
    let r = 1;
    for (let i = 1, n = u.tokens.length; i < n - 1; ++i) {
      const o = u.tokens[i];
      if (o.type !== "inline" || !o.children || o.children.length !== 1 && o.children.length !== 3 || o.children.length === 1 && o.children[0].type !== "image") continue;
      if (o.children.length === 3) {
        const [c, f, l] = o.children;
        if (c.type !== "link_open" || f.type !== "image" || l.type !== "link_close") continue;
      }
      if (i !== 0 && u.tokens[i - 1].type !== "paragraph_open" || i !== n - 1 && u.tokens[i + 1].type !== "paragraph_close") continue;
      const a = u.tokens[i - 1];
      let s;
      if (a.type = "figure_open", a.tag = "figure", u.tokens[i + 1].type = "figure_close", u.tokens[i + 1].tag = "figure", t.dataType && u.tokens[i - 1].attrPush(["data-type", "image"]), t.link && o.children.length === 1) {
        [s] = o.children;
        const c = new u.Token("link_open", "a", 1);
        c.attrPush(["href", s.attrGet("src")]), o.children.unshift(c), o.children.push(new u.Token("link_close", "a", -1));
      }
      if (s = o.children.length === 1 ? o.children[0] : o.children[1], t.figcaption) {
        const c = U0(t.figcaption, s);
        if (c) {
          const [f] = e.parseInline(c, u.env);
          o.children.push(new u.Token("figcaption_open", "figcaption", 1)), o.children.push(...f.children), o.children.push(new u.Token("figcaption_close", "figcaption", -1)), s.attrs && (s.attrs = ua(s.attrs, "title"));
        }
      }
      if (t.copyAttrs && s.attrs) {
        const c = t.copyAttrs === !0 ? "" : t.copyAttrs;
        a.attrs = s.attrs.filter(([f]) => f.match(c)).map((f) => Array.from(f));
      }
      if (t.tabindex && (u.tokens[i - 1].attrPush(["tabindex", r]), r++), t.lazy && (s.attrs.some(([c]) => c === "loading") || s.attrs.push(["loading", "lazy"])), t.async && (s.attrs.some(([c]) => c === "decoding") || s.attrs.push(["decoding", "async"])), t.classes && typeof t.classes == "string") {
        let c = !1;
        for (let f = 0, l = s.attrs.length; f < l && !c; f++) {
          const d = s.attrs[f];
          d[0] === "class" && (d[1] = `${d[1]} ${t.classes}`, c = !0);
        }
        c || s.attrs.push(["class", t.classes]);
      }
      if (t.removeSrc) {
        const c = s.attrs.find(([f]) => f === "src");
        s.attrs.push(["data-src", c[1]]), na(s, "src");
      }
    }
  });
}
const G0 = /\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g;
function W0(e, t) {
  const u = e.posMax, r = e.pos;
  if (e.src.charCodeAt(r) !== 126 || t || r + 2 >= u)
    return !1;
  e.pos = r + 1;
  let i = !1;
  for (; e.pos < u; ) {
    if (e.src.charCodeAt(e.pos) === 126) {
      i = !0;
      break;
    }
    e.md.inline.skipToken(e);
  }
  if (!i || r + 1 === e.pos)
    return e.pos = r, !1;
  const n = e.src.slice(r + 1, e.pos);
  if (n.match(/(^|[^\\])(\\\\)*\s/))
    return e.pos = r, !1;
  e.posMax = e.pos, e.pos = r + 1;
  const o = e.push("sub_open", "sub", 1);
  o.markup = "~";
  const a = e.push("text", "", 0);
  a.content = n.replace(G0, "$1");
  const s = e.push("sub_close", "sub", -1);
  return s.markup = "~", e.pos = e.posMax + 1, e.posMax = u, !0;
}
function Z0(e) {
  e.inline.ruler.after("emphasis", "sub", W0);
}
const V0 = /\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g;
function X0(e, t) {
  const u = e.posMax, r = e.pos;
  if (e.src.charCodeAt(r) !== 94 || t || r + 2 >= u)
    return !1;
  e.pos = r + 1;
  let i = !1;
  for (; e.pos < u; ) {
    if (e.src.charCodeAt(e.pos) === 94) {
      i = !0;
      break;
    }
    e.md.inline.skipToken(e);
  }
  if (!i || r + 1 === e.pos)
    return e.pos = r, !1;
  const n = e.src.slice(r + 1, e.pos);
  if (n.match(/(^|[^\\])(\\\\)*\s/))
    return e.pos = r, !1;
  e.posMax = e.pos, e.pos = r + 1;
  const o = e.push("sup_open", "sup", 1);
  o.markup = "^";
  const a = e.push("text", "", 0);
  a.content = n.replace(V0, "$1");
  const s = e.push("sup_close", "sup", -1);
  return s.markup = "^", e.pos = e.posMax + 1, e.posMax = u, !0;
}
function Y0(e) {
  e.inline.ruler.after("emphasis", "sup", X0);
}
var Q0 = typeof performance == "object" && performance && typeof performance.now == "function" ? performance : Date, ra = /* @__PURE__ */ new Set(), wr = typeof process == "object" && process ? process : {}, ia = (e, t, u, r) => {
  typeof wr.emitWarning == "function" ? wr.emitWarning(e, t, u, r) : console.error(`[${u}] ${t}: ${e}`);
}, Tn = globalThis.AbortController, Ui = globalThis.AbortSignal, bo;
if (typeof Tn > "u") {
  Ui = class {
    constructor() {
      ie(this, "onabort");
      ie(this, "_onabort", []);
      ie(this, "reason");
      ie(this, "aborted", !1);
    }
    addEventListener(u, r) {
      this._onabort.push(r);
    }
  }, Tn = class {
    constructor() {
      ie(this, "signal", new Ui());
      t();
    }
    abort(u) {
      var r, i;
      if (!this.signal.aborted) {
        this.signal.reason = u, this.signal.aborted = !0;
        for (let n of this.signal._onabort) n(u);
        (i = (r = this.signal).onabort) == null || i.call(r, u);
      }
    }
  };
  let e = ((bo = wr.env) == null ? void 0 : bo.LRU_CACHE_IGNORE_AC_WARNING) !== "1", t = () => {
    e && (e = !1, ia("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", t));
  };
}
var K0 = (e) => !ra.has(e), Ct = (e) => e && e === Math.floor(e) && e > 0 && isFinite(e), oa = (e) => Ct(e) ? e <= Math.pow(2, 8) ? Uint8Array : e <= Math.pow(2, 16) ? Uint16Array : e <= Math.pow(2, 32) ? Uint32Array : e <= Number.MAX_SAFE_INTEGER ? sn : null : null, sn = class extends Array {
  constructor(t) {
    super(t), this.fill(0);
  }
}, ht, tu, J0 = (ht = class {
  constructor(t, u) {
    ie(this, "heap");
    ie(this, "length");
    if (!m(ht, tu)) throw new TypeError("instantiate Stack using Stack.create(n)");
    this.heap = new u(t), this.length = 0;
  }
  static create(t) {
    let u = oa(t);
    if (!u) return [];
    q(ht, tu, !0);
    let r = new ht(t, u);
    return q(ht, tu, !1), r;
  }
  push(t) {
    this.heap[this.length++] = t;
  }
  pop() {
    return this.heap[--this.length];
  }
}, tu = new WeakMap(), K(ht, tu, !1), ht), vo, xo, qe, ze, Ve, Pt, Xe, uu, nu, Ye, me, Qe, he, ae, Z, Ee, Ne, Ce, be, Ke, ve, Je, et, Pe, je, tt, Tt, Fe, ru, O, Er, jt, At, Ou, He, aa, Ht, iu, Mu, _t, wt, Fr, ln, cn, oe, Dr, Au, Et, Tr, ou, ef = (ou = class {
  constructor(t) {
    K(this, O);
    K(this, qe);
    K(this, ze);
    K(this, Ve);
    K(this, Pt);
    K(this, Xe);
    K(this, uu);
    K(this, nu);
    K(this, Ye);
    ie(this, "ttl");
    ie(this, "ttlResolution");
    ie(this, "ttlAutopurge");
    ie(this, "updateAgeOnGet");
    ie(this, "updateAgeOnHas");
    ie(this, "allowStale");
    ie(this, "noDisposeOnSet");
    ie(this, "noUpdateTTL");
    ie(this, "maxEntrySize");
    ie(this, "sizeCalculation");
    ie(this, "noDeleteOnFetchRejection");
    ie(this, "noDeleteOnStaleGet");
    ie(this, "allowStaleOnFetchAbort");
    ie(this, "allowStaleOnFetchRejection");
    ie(this, "ignoreFetchAbort");
    K(this, me);
    K(this, Qe);
    K(this, he);
    K(this, ae);
    K(this, Z);
    K(this, Ee);
    K(this, Ne);
    K(this, Ce);
    K(this, be);
    K(this, Ke);
    K(this, ve);
    K(this, Je);
    K(this, et);
    K(this, Pe);
    K(this, je);
    K(this, tt);
    K(this, Tt);
    K(this, Fe);
    K(this, ru);
    K(this, jt, () => {
    });
    K(this, At, () => {
    });
    K(this, Ou, () => {
    });
    K(this, He, () => !1);
    K(this, Ht, (t) => {
    });
    K(this, iu, (t, u, r) => {
    });
    K(this, Mu, (t, u, r, i) => {
      if (r || i) throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
      return 0;
    });
    ie(this, vo, "LRUCache");
    let { max: u = 0, ttl: r, ttlResolution: i = 1, ttlAutopurge: n, updateAgeOnGet: o, updateAgeOnHas: a, allowStale: s, dispose: c, onInsert: f, disposeAfter: l, noDisposeOnSet: d, noUpdateTTL: g, maxSize: p = 0, maxEntrySize: C = 0, sizeCalculation: k, fetchMethod: w, memoMethod: v, noDeleteOnFetchRejection: b, noDeleteOnStaleGet: A, allowStaleOnFetchRejection: y, allowStaleOnFetchAbort: E, ignoreFetchAbort: D, perf: _ } = t;
    if (_ !== void 0 && typeof (_ == null ? void 0 : _.now) != "function") throw new TypeError("perf option must have a now() method if specified");
    if (q(this, Ye, _ ?? Q0), u !== 0 && !Ct(u)) throw new TypeError("max option must be a nonnegative integer");
    let H = u ? oa(u) : Array;
    if (!H) throw new Error("invalid max value: " + u);
    if (q(this, qe, u), q(this, ze, p), this.maxEntrySize = C || m(this, ze), this.sizeCalculation = k, this.sizeCalculation) {
      if (!m(this, ze) && !this.maxEntrySize) throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      if (typeof this.sizeCalculation != "function") throw new TypeError("sizeCalculation set to non-function");
    }
    if (v !== void 0 && typeof v != "function") throw new TypeError("memoMethod must be a function if defined");
    if (q(this, nu, v), w !== void 0 && typeof w != "function") throw new TypeError("fetchMethod must be a function if specified");
    if (q(this, uu, w), q(this, Tt, !!w), q(this, he, /* @__PURE__ */ new Map()), q(this, ae, new Array(u).fill(void 0)), q(this, Z, new Array(u).fill(void 0)), q(this, Ee, new H(u)), q(this, Ne, new H(u)), q(this, Ce, 0), q(this, be, 0), q(this, Ke, J0.create(u)), q(this, me, 0), q(this, Qe, 0), typeof c == "function" && q(this, Ve, c), typeof f == "function" && q(this, Pt, f), typeof l == "function" ? (q(this, Xe, l), q(this, ve, [])) : (q(this, Xe, void 0), q(this, ve, void 0)), q(this, tt, !!m(this, Ve)), q(this, ru, !!m(this, Pt)), q(this, Fe, !!m(this, Xe)), this.noDisposeOnSet = !!d, this.noUpdateTTL = !!g, this.noDeleteOnFetchRejection = !!b, this.allowStaleOnFetchRejection = !!y, this.allowStaleOnFetchAbort = !!E, this.ignoreFetchAbort = !!D, this.maxEntrySize !== 0) {
      if (m(this, ze) !== 0 && !Ct(m(this, ze))) throw new TypeError("maxSize must be a positive integer if specified");
      if (!Ct(this.maxEntrySize)) throw new TypeError("maxEntrySize must be a positive integer if specified");
      z(this, O, aa).call(this);
    }
    if (this.allowStale = !!s, this.noDeleteOnStaleGet = !!A, this.updateAgeOnGet = !!o, this.updateAgeOnHas = !!a, this.ttlResolution = Ct(i) || i === 0 ? i : 1, this.ttlAutopurge = !!n, this.ttl = r || 0, this.ttl) {
      if (!Ct(this.ttl)) throw new TypeError("ttl must be a positive integer if specified");
      z(this, O, Er).call(this);
    }
    if (m(this, qe) === 0 && this.ttl === 0 && m(this, ze) === 0) throw new TypeError("At least one of max, maxSize, or ttl is required");
    if (!this.ttlAutopurge && !m(this, qe) && !m(this, ze)) {
      let G = "LRU_CACHE_UNBOUNDED";
      K0(G) && (ra.add(G), ia("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedCacheWarning", G, ou));
    }
  }
  get perf() {
    return m(this, Ye);
  }
  static unsafeExposeInternals(t) {
    return { starts: m(t, et), ttls: m(t, Pe), autopurgeTimers: m(t, je), sizes: m(t, Je), keyMap: m(t, he), keyList: m(t, ae), valList: m(t, Z), next: m(t, Ee), prev: m(t, Ne), get head() {
      return m(t, Ce);
    }, get tail() {
      return m(t, be);
    }, free: m(t, Ke), isBackgroundFetch: (u) => {
      var r;
      return z(r = t, O, oe).call(r, u);
    }, backgroundFetch: (u, r, i, n) => {
      var o;
      return z(o = t, O, cn).call(o, u, r, i, n);
    }, moveToTail: (u) => {
      var r;
      return z(r = t, O, Au).call(r, u);
    }, indexes: (u) => {
      var r;
      return z(r = t, O, _t).call(r, u);
    }, rindexes: (u) => {
      var r;
      return z(r = t, O, wt).call(r, u);
    }, isStale: (u) => {
      var r;
      return m(r = t, He).call(r, u);
    } };
  }
  get max() {
    return m(this, qe);
  }
  get maxSize() {
    return m(this, ze);
  }
  get calculatedSize() {
    return m(this, Qe);
  }
  get size() {
    return m(this, me);
  }
  get fetchMethod() {
    return m(this, uu);
  }
  get memoMethod() {
    return m(this, nu);
  }
  get dispose() {
    return m(this, Ve);
  }
  get onInsert() {
    return m(this, Pt);
  }
  get disposeAfter() {
    return m(this, Xe);
  }
  getRemainingTTL(t) {
    return m(this, he).has(t) ? 1 / 0 : 0;
  }
  *entries() {
    for (let t of z(this, O, _t).call(this)) m(this, Z)[t] !== void 0 && m(this, ae)[t] !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield [m(this, ae)[t], m(this, Z)[t]]);
  }
  *rentries() {
    for (let t of z(this, O, wt).call(this)) m(this, Z)[t] !== void 0 && m(this, ae)[t] !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield [m(this, ae)[t], m(this, Z)[t]]);
  }
  *keys() {
    for (let t of z(this, O, _t).call(this)) {
      let u = m(this, ae)[t];
      u !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield u);
    }
  }
  *rkeys() {
    for (let t of z(this, O, wt).call(this)) {
      let u = m(this, ae)[t];
      u !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield u);
    }
  }
  *values() {
    for (let t of z(this, O, _t).call(this)) m(this, Z)[t] !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield m(this, Z)[t]);
  }
  *rvalues() {
    for (let t of z(this, O, wt).call(this)) m(this, Z)[t] !== void 0 && !z(this, O, oe).call(this, m(this, Z)[t]) && (yield m(this, Z)[t]);
  }
  [(xo = Symbol.iterator, vo = Symbol.toStringTag, xo)]() {
    return this.entries();
  }
  find(t, u = {}) {
    for (let r of z(this, O, _t).call(this)) {
      let i = m(this, Z)[r], n = z(this, O, oe).call(this, i) ? i.__staleWhileFetching : i;
      if (n !== void 0 && t(n, m(this, ae)[r], this)) return this.get(m(this, ae)[r], u);
    }
  }
  forEach(t, u = this) {
    for (let r of z(this, O, _t).call(this)) {
      let i = m(this, Z)[r], n = z(this, O, oe).call(this, i) ? i.__staleWhileFetching : i;
      n !== void 0 && t.call(u, n, m(this, ae)[r], this);
    }
  }
  rforEach(t, u = this) {
    for (let r of z(this, O, wt).call(this)) {
      let i = m(this, Z)[r], n = z(this, O, oe).call(this, i) ? i.__staleWhileFetching : i;
      n !== void 0 && t.call(u, n, m(this, ae)[r], this);
    }
  }
  purgeStale() {
    let t = !1;
    for (let u of z(this, O, wt).call(this, { allowStale: !0 })) m(this, He).call(this, u) && (z(this, O, Et).call(this, m(this, ae)[u], "expire"), t = !0);
    return t;
  }
  info(t) {
    let u = m(this, he).get(t);
    if (u === void 0) return;
    let r = m(this, Z)[u], i = z(this, O, oe).call(this, r) ? r.__staleWhileFetching : r;
    if (i === void 0) return;
    let n = { value: i };
    if (m(this, Pe) && m(this, et)) {
      let o = m(this, Pe)[u], a = m(this, et)[u];
      if (o && a) {
        let s = o - (m(this, Ye).now() - a);
        n.ttl = s, n.start = Date.now();
      }
    }
    return m(this, Je) && (n.size = m(this, Je)[u]), n;
  }
  dump() {
    let t = [];
    for (let u of z(this, O, _t).call(this, { allowStale: !0 })) {
      let r = m(this, ae)[u], i = m(this, Z)[u], n = z(this, O, oe).call(this, i) ? i.__staleWhileFetching : i;
      if (n === void 0 || r === void 0) continue;
      let o = { value: n };
      if (m(this, Pe) && m(this, et)) {
        o.ttl = m(this, Pe)[u];
        let a = m(this, Ye).now() - m(this, et)[u];
        o.start = Math.floor(Date.now() - a);
      }
      m(this, Je) && (o.size = m(this, Je)[u]), t.unshift([r, o]);
    }
    return t;
  }
  load(t) {
    this.clear();
    for (let [u, r] of t) {
      if (r.start) {
        let i = Date.now() - r.start;
        r.start = m(this, Ye).now() - i;
      }
      this.set(u, r.value, r);
    }
  }
  set(t, u, r = {}) {
    var d, g, p, C, k, w, v;
    if (u === void 0) return this.delete(t), this;
    let { ttl: i = this.ttl, start: n, noDisposeOnSet: o = this.noDisposeOnSet, sizeCalculation: a = this.sizeCalculation, status: s } = r, { noUpdateTTL: c = this.noUpdateTTL } = r, f = m(this, Mu).call(this, t, u, r.size || 0, a);
    if (this.maxEntrySize && f > this.maxEntrySize) return s && (s.set = "miss", s.maxEntrySizeExceeded = !0), z(this, O, Et).call(this, t, "set"), this;
    let l = m(this, me) === 0 ? void 0 : m(this, he).get(t);
    if (l === void 0) l = m(this, me) === 0 ? m(this, be) : m(this, Ke).length !== 0 ? m(this, Ke).pop() : m(this, me) === m(this, qe) ? z(this, O, ln).call(this, !1) : m(this, me), m(this, ae)[l] = t, m(this, Z)[l] = u, m(this, he).set(t, l), m(this, Ee)[m(this, be)] = l, m(this, Ne)[l] = m(this, be), q(this, be, l), Vu(this, me)._++, m(this, iu).call(this, l, f, s), s && (s.set = "add"), c = !1, m(this, ru) && ((d = m(this, Pt)) == null || d.call(this, u, t, "add"));
    else {
      z(this, O, Au).call(this, l);
      let b = m(this, Z)[l];
      if (u !== b) {
        if (m(this, Tt) && z(this, O, oe).call(this, b)) {
          b.__abortController.abort(new Error("replaced"));
          let { __staleWhileFetching: A } = b;
          A !== void 0 && !o && (m(this, tt) && ((g = m(this, Ve)) == null || g.call(this, A, t, "set")), m(this, Fe) && ((p = m(this, ve)) == null || p.push([A, t, "set"])));
        } else o || (m(this, tt) && ((C = m(this, Ve)) == null || C.call(this, b, t, "set")), m(this, Fe) && ((k = m(this, ve)) == null || k.push([b, t, "set"])));
        if (m(this, Ht).call(this, l), m(this, iu).call(this, l, f, s), m(this, Z)[l] = u, s) {
          s.set = "replace";
          let A = b && z(this, O, oe).call(this, b) ? b.__staleWhileFetching : b;
          A !== void 0 && (s.oldValue = A);
        }
      } else s && (s.set = "update");
      m(this, ru) && ((w = this.onInsert) == null || w.call(this, u, t, u === b ? "update" : "replace"));
    }
    if (i !== 0 && !m(this, Pe) && z(this, O, Er).call(this), m(this, Pe) && (c || m(this, Ou).call(this, l, i, n), s && m(this, At).call(this, s, l)), !o && m(this, Fe) && m(this, ve)) {
      let b = m(this, ve), A;
      for (; A = b == null ? void 0 : b.shift(); ) (v = m(this, Xe)) == null || v.call(this, ...A);
    }
    return this;
  }
  pop() {
    var t;
    try {
      for (; m(this, me); ) {
        let u = m(this, Z)[m(this, Ce)];
        if (z(this, O, ln).call(this, !0), z(this, O, oe).call(this, u)) {
          if (u.__staleWhileFetching) return u.__staleWhileFetching;
        } else if (u !== void 0) return u;
      }
    } finally {
      if (m(this, Fe) && m(this, ve)) {
        let u = m(this, ve), r;
        for (; r = u == null ? void 0 : u.shift(); ) (t = m(this, Xe)) == null || t.call(this, ...r);
      }
    }
  }
  has(t, u = {}) {
    let { updateAgeOnHas: r = this.updateAgeOnHas, status: i } = u, n = m(this, he).get(t);
    if (n !== void 0) {
      let o = m(this, Z)[n];
      if (z(this, O, oe).call(this, o) && o.__staleWhileFetching === void 0) return !1;
      if (m(this, He).call(this, n)) i && (i.has = "stale", m(this, At).call(this, i, n));
      else return r && m(this, jt).call(this, n), i && (i.has = "hit", m(this, At).call(this, i, n)), !0;
    } else i && (i.has = "miss");
    return !1;
  }
  peek(t, u = {}) {
    let { allowStale: r = this.allowStale } = u, i = m(this, he).get(t);
    if (i === void 0 || !r && m(this, He).call(this, i)) return;
    let n = m(this, Z)[i];
    return z(this, O, oe).call(this, n) ? n.__staleWhileFetching : n;
  }
  async fetch(t, u = {}) {
    let { allowStale: r = this.allowStale, updateAgeOnGet: i = this.updateAgeOnGet, noDeleteOnStaleGet: n = this.noDeleteOnStaleGet, ttl: o = this.ttl, noDisposeOnSet: a = this.noDisposeOnSet, size: s = 0, sizeCalculation: c = this.sizeCalculation, noUpdateTTL: f = this.noUpdateTTL, noDeleteOnFetchRejection: l = this.noDeleteOnFetchRejection, allowStaleOnFetchRejection: d = this.allowStaleOnFetchRejection, ignoreFetchAbort: g = this.ignoreFetchAbort, allowStaleOnFetchAbort: p = this.allowStaleOnFetchAbort, context: C, forceRefresh: k = !1, status: w, signal: v } = u;
    if (!m(this, Tt)) return w && (w.fetch = "get"), this.get(t, { allowStale: r, updateAgeOnGet: i, noDeleteOnStaleGet: n, status: w });
    let b = { allowStale: r, updateAgeOnGet: i, noDeleteOnStaleGet: n, ttl: o, noDisposeOnSet: a, size: s, sizeCalculation: c, noUpdateTTL: f, noDeleteOnFetchRejection: l, allowStaleOnFetchRejection: d, allowStaleOnFetchAbort: p, ignoreFetchAbort: g, status: w, signal: v }, A = m(this, he).get(t);
    if (A === void 0) {
      w && (w.fetch = "miss");
      let y = z(this, O, cn).call(this, t, A, b, C);
      return y.__returned = y;
    } else {
      let y = m(this, Z)[A];
      if (z(this, O, oe).call(this, y)) {
        let H = r && y.__staleWhileFetching !== void 0;
        return w && (w.fetch = "inflight", H && (w.returnedStale = !0)), H ? y.__staleWhileFetching : y.__returned = y;
      }
      let E = m(this, He).call(this, A);
      if (!k && !E) return w && (w.fetch = "hit"), z(this, O, Au).call(this, A), i && m(this, jt).call(this, A), w && m(this, At).call(this, w, A), y;
      let D = z(this, O, cn).call(this, t, A, b, C), _ = D.__staleWhileFetching !== void 0 && r;
      return w && (w.fetch = E ? "stale" : "refresh", _ && E && (w.returnedStale = !0)), _ ? D.__staleWhileFetching : D.__returned = D;
    }
  }
  async forceFetch(t, u = {}) {
    let r = await this.fetch(t, u);
    if (r === void 0) throw new Error("fetch() returned undefined");
    return r;
  }
  memo(t, u = {}) {
    let r = m(this, nu);
    if (!r) throw new Error("no memoMethod provided to constructor");
    let { context: i, forceRefresh: n, ...o } = u, a = this.get(t, o);
    if (!n && a !== void 0) return a;
    let s = r(t, a, { options: o, context: i });
    return this.set(t, s, o), s;
  }
  get(t, u = {}) {
    let { allowStale: r = this.allowStale, updateAgeOnGet: i = this.updateAgeOnGet, noDeleteOnStaleGet: n = this.noDeleteOnStaleGet, status: o } = u, a = m(this, he).get(t);
    if (a !== void 0) {
      let s = m(this, Z)[a], c = z(this, O, oe).call(this, s);
      return o && m(this, At).call(this, o, a), m(this, He).call(this, a) ? (o && (o.get = "stale"), c ? (o && r && s.__staleWhileFetching !== void 0 && (o.returnedStale = !0), r ? s.__staleWhileFetching : void 0) : (n || z(this, O, Et).call(this, t, "expire"), o && r && (o.returnedStale = !0), r ? s : void 0)) : (o && (o.get = "hit"), c ? s.__staleWhileFetching : (z(this, O, Au).call(this, a), i && m(this, jt).call(this, a), s));
    } else o && (o.get = "miss");
  }
  delete(t) {
    return z(this, O, Et).call(this, t, "delete");
  }
  clear() {
    return z(this, O, Tr).call(this, "delete");
  }
}, qe = new WeakMap(), ze = new WeakMap(), Ve = new WeakMap(), Pt = new WeakMap(), Xe = new WeakMap(), uu = new WeakMap(), nu = new WeakMap(), Ye = new WeakMap(), me = new WeakMap(), Qe = new WeakMap(), he = new WeakMap(), ae = new WeakMap(), Z = new WeakMap(), Ee = new WeakMap(), Ne = new WeakMap(), Ce = new WeakMap(), be = new WeakMap(), Ke = new WeakMap(), ve = new WeakMap(), Je = new WeakMap(), et = new WeakMap(), Pe = new WeakMap(), je = new WeakMap(), tt = new WeakMap(), Tt = new WeakMap(), Fe = new WeakMap(), ru = new WeakMap(), O = new WeakSet(), Er = function() {
  let t = new sn(m(this, qe)), u = new sn(m(this, qe));
  q(this, Pe, t), q(this, et, u);
  let r = this.ttlAutopurge ? new Array(m(this, qe)) : void 0;
  q(this, je, r), q(this, Ou, (a, s, c = m(this, Ye).now()) => {
    u[a] = s !== 0 ? c : 0, t[a] = s, i(a, s);
  }), q(this, jt, (a) => {
    u[a] = t[a] !== 0 ? m(this, Ye).now() : 0, i(a, t[a]);
  });
  let i = this.ttlAutopurge ? (a, s) => {
    if (r != null && r[a] && (clearTimeout(r[a]), r[a] = void 0), s && s !== 0 && r) {
      let c = setTimeout(() => {
        m(this, He).call(this, a) && z(this, O, Et).call(this, m(this, ae)[a], "expire");
      }, s + 1);
      c.unref && c.unref(), r[a] = c;
    }
  } : () => {
  };
  q(this, At, (a, s) => {
    if (t[s]) {
      let c = t[s], f = u[s];
      if (!c || !f) return;
      a.ttl = c, a.start = f, a.now = n || o();
      let l = a.now - f;
      a.remainingTTL = c - l;
    }
  });
  let n = 0, o = () => {
    let a = m(this, Ye).now();
    if (this.ttlResolution > 0) {
      n = a;
      let s = setTimeout(() => n = 0, this.ttlResolution);
      s.unref && s.unref();
    }
    return a;
  };
  this.getRemainingTTL = (a) => {
    let s = m(this, he).get(a);
    if (s === void 0) return 0;
    let c = t[s], f = u[s];
    if (!c || !f) return 1 / 0;
    let l = (n || o()) - f;
    return c - l;
  }, q(this, He, (a) => {
    let s = u[a], c = t[a];
    return !!c && !!s && (n || o()) - s > c;
  });
}, jt = new WeakMap(), At = new WeakMap(), Ou = new WeakMap(), He = new WeakMap(), aa = function() {
  let t = new sn(m(this, qe));
  q(this, Qe, 0), q(this, Je, t), q(this, Ht, (u) => {
    q(this, Qe, m(this, Qe) - t[u]), t[u] = 0;
  }), q(this, Mu, (u, r, i, n) => {
    if (z(this, O, oe).call(this, r)) return 0;
    if (!Ct(i)) if (n) {
      if (typeof n != "function") throw new TypeError("sizeCalculation must be a function");
      if (i = n(r, u), !Ct(i)) throw new TypeError("sizeCalculation return invalid (expect positive integer)");
    } else throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
    return i;
  }), q(this, iu, (u, r, i) => {
    if (t[u] = r, m(this, ze)) {
      let n = m(this, ze) - t[u];
      for (; m(this, Qe) > n; ) z(this, O, ln).call(this, !0);
    }
    q(this, Qe, m(this, Qe) + t[u]), i && (i.entrySize = r, i.totalCalculatedSize = m(this, Qe));
  });
}, Ht = new WeakMap(), iu = new WeakMap(), Mu = new WeakMap(), _t = function* ({ allowStale: t = this.allowStale } = {}) {
  if (m(this, me)) for (let u = m(this, be); !(!z(this, O, Fr).call(this, u) || ((t || !m(this, He).call(this, u)) && (yield u), u === m(this, Ce))); ) u = m(this, Ne)[u];
}, wt = function* ({ allowStale: t = this.allowStale } = {}) {
  if (m(this, me)) for (let u = m(this, Ce); !(!z(this, O, Fr).call(this, u) || ((t || !m(this, He).call(this, u)) && (yield u), u === m(this, be))); ) u = m(this, Ee)[u];
}, Fr = function(t) {
  return t !== void 0 && m(this, he).get(m(this, ae)[t]) === t;
}, ln = function(t) {
  var n, o, a;
  let u = m(this, Ce), r = m(this, ae)[u], i = m(this, Z)[u];
  return m(this, Tt) && z(this, O, oe).call(this, i) ? i.__abortController.abort(new Error("evicted")) : (m(this, tt) || m(this, Fe)) && (m(this, tt) && ((n = m(this, Ve)) == null || n.call(this, i, r, "evict")), m(this, Fe) && ((o = m(this, ve)) == null || o.push([i, r, "evict"]))), m(this, Ht).call(this, u), (a = m(this, je)) != null && a[u] && (clearTimeout(m(this, je)[u]), m(this, je)[u] = void 0), t && (m(this, ae)[u] = void 0, m(this, Z)[u] = void 0, m(this, Ke).push(u)), m(this, me) === 1 ? (q(this, Ce, q(this, be, 0)), m(this, Ke).length = 0) : q(this, Ce, m(this, Ee)[u]), m(this, he).delete(r), Vu(this, me)._--, u;
}, cn = function(t, u, r, i) {
  let n = u === void 0 ? void 0 : m(this, Z)[u];
  if (z(this, O, oe).call(this, n)) return n;
  let o = new Tn(), { signal: a } = r;
  a == null || a.addEventListener("abort", () => o.abort(a.reason), { signal: o.signal });
  let s = { signal: o.signal, options: r, context: i }, c = (C, k = !1) => {
    let { aborted: w } = o.signal, v = r.ignoreFetchAbort && C !== void 0, b = r.ignoreFetchAbort || !!(r.allowStaleOnFetchAbort && C !== void 0);
    if (r.status && (w && !k ? (r.status.fetchAborted = !0, r.status.fetchError = o.signal.reason, v && (r.status.fetchAbortIgnored = !0)) : r.status.fetchResolved = !0), w && !v && !k) return l(o.signal.reason, b);
    let A = g, y = m(this, Z)[u];
    return (y === g || v && k && y === void 0) && (C === void 0 ? A.__staleWhileFetching !== void 0 ? m(this, Z)[u] = A.__staleWhileFetching : z(this, O, Et).call(this, t, "fetch") : (r.status && (r.status.fetchUpdated = !0), this.set(t, C, s.options))), C;
  }, f = (C) => (r.status && (r.status.fetchRejected = !0, r.status.fetchError = C), l(C, !1)), l = (C, k) => {
    let { aborted: w } = o.signal, v = w && r.allowStaleOnFetchAbort, b = v || r.allowStaleOnFetchRejection, A = b || r.noDeleteOnFetchRejection, y = g;
    if (m(this, Z)[u] === g && (!A || !k && y.__staleWhileFetching === void 0 ? z(this, O, Et).call(this, t, "fetch") : v || (m(this, Z)[u] = y.__staleWhileFetching)), b) return r.status && y.__staleWhileFetching !== void 0 && (r.status.returnedStale = !0), y.__staleWhileFetching;
    if (y.__returned === y) throw C;
  }, d = (C, k) => {
    var v;
    let w = (v = m(this, uu)) == null ? void 0 : v.call(this, t, n, s);
    w && w instanceof Promise && w.then((b) => C(b === void 0 ? void 0 : b), k), o.signal.addEventListener("abort", () => {
      (!r.ignoreFetchAbort || r.allowStaleOnFetchAbort) && (C(void 0), r.allowStaleOnFetchAbort && (C = (b) => c(b, !0)));
    });
  };
  r.status && (r.status.fetchDispatched = !0);
  let g = new Promise(d).then(c, f), p = Object.assign(g, { __abortController: o, __staleWhileFetching: n, __returned: void 0 });
  return u === void 0 ? (this.set(t, p, { ...s.options, status: void 0 }), u = m(this, he).get(t)) : m(this, Z)[u] = p, p;
}, oe = function(t) {
  if (!m(this, Tt)) return !1;
  let u = t;
  return !!u && u instanceof Promise && u.hasOwnProperty("__staleWhileFetching") && u.__abortController instanceof Tn;
}, Dr = function(t, u) {
  m(this, Ne)[u] = t, m(this, Ee)[t] = u;
}, Au = function(t) {
  t !== m(this, be) && (t === m(this, Ce) ? q(this, Ce, m(this, Ee)[t]) : z(this, O, Dr).call(this, m(this, Ne)[t], m(this, Ee)[t]), z(this, O, Dr).call(this, m(this, be), t), q(this, be, t));
}, Et = function(t, u) {
  var i, n, o, a, s, c;
  let r = !1;
  if (m(this, me) !== 0) {
    let f = m(this, he).get(t);
    if (f !== void 0) if ((i = m(this, je)) != null && i[f] && (clearTimeout((n = m(this, je)) == null ? void 0 : n[f]), m(this, je)[f] = void 0), r = !0, m(this, me) === 1) z(this, O, Tr).call(this, u);
    else {
      m(this, Ht).call(this, f);
      let l = m(this, Z)[f];
      if (z(this, O, oe).call(this, l) ? l.__abortController.abort(new Error("deleted")) : (m(this, tt) || m(this, Fe)) && (m(this, tt) && ((o = m(this, Ve)) == null || o.call(this, l, t, u)), m(this, Fe) && ((a = m(this, ve)) == null || a.push([l, t, u]))), m(this, he).delete(t), m(this, ae)[f] = void 0, m(this, Z)[f] = void 0, f === m(this, be)) q(this, be, m(this, Ne)[f]);
      else if (f === m(this, Ce)) q(this, Ce, m(this, Ee)[f]);
      else {
        let d = m(this, Ne)[f];
        m(this, Ee)[d] = m(this, Ee)[f];
        let g = m(this, Ee)[f];
        m(this, Ne)[g] = m(this, Ne)[f];
      }
      Vu(this, me)._--, m(this, Ke).push(f);
    }
  }
  if (m(this, Fe) && ((s = m(this, ve)) != null && s.length)) {
    let f = m(this, ve), l;
    for (; l = f == null ? void 0 : f.shift(); ) (c = m(this, Xe)) == null || c.call(this, ...l);
  }
  return r;
}, Tr = function(t) {
  var u, r, i, n;
  for (let o of z(this, O, wt).call(this, { allowStale: !0 })) {
    let a = m(this, Z)[o];
    if (z(this, O, oe).call(this, a)) a.__abortController.abort(new Error("deleted"));
    else {
      let s = m(this, ae)[o];
      m(this, tt) && ((u = m(this, Ve)) == null || u.call(this, a, s, t)), m(this, Fe) && ((r = m(this, ve)) == null || r.push([a, s, t]));
    }
  }
  if (m(this, he).clear(), m(this, Z).fill(void 0), m(this, ae).fill(void 0), m(this, Pe) && m(this, et)) {
    m(this, Pe).fill(0), m(this, et).fill(0);
    for (let o of m(this, je) ?? []) o !== void 0 && clearTimeout(o);
    (i = m(this, je)) == null || i.fill(void 0);
  }
  if (m(this, Je) && m(this, Je).fill(0), q(this, Ce, 0), q(this, be, 0), m(this, Ke).length = 0, q(this, Qe, 0), q(this, me, 0), m(this, Fe) && m(this, ve)) {
    let o = m(this, ve), a;
    for (; a = o == null ? void 0 : o.shift(); ) (n = m(this, Xe)) == null || n.call(this, ...a);
  }
}, ou);
/*! medium-zoom 1.1.0 | MIT License | https://github.com/francoischalifour/medium-zoom */
var Nt = Object.assign || function(e) {
  for (var t = 1; t < arguments.length; t++) {
    var u = arguments[t];
    for (var r in u)
      Object.prototype.hasOwnProperty.call(u, r) && (e[r] = u[r]);
  }
  return e;
}, Ju = function(t) {
  return t.tagName === "IMG";
}, tf = function(t) {
  return NodeList.prototype.isPrototypeOf(t);
}, fn = function(t) {
  return t && t.nodeType === 1;
}, qi = function(t) {
  var u = t.currentSrc || t.src;
  return u.substr(-4).toLowerCase() === ".svg";
}, Gi = function(t) {
  try {
    return Array.isArray(t) ? t.filter(Ju) : tf(t) ? [].slice.call(t).filter(Ju) : fn(t) ? [t].filter(Ju) : typeof t == "string" ? [].slice.call(document.querySelectorAll(t)).filter(Ju) : [];
  } catch {
    throw new TypeError(`The provided selector is invalid.
Expects a CSS selector, a Node element, a NodeList or an array.
See: https://github.com/francoischalifour/medium-zoom`);
  }
}, uf = function(t) {
  var u = document.createElement("div");
  return u.classList.add("medium-zoom-overlay"), u.style.background = t, u;
}, nf = function(t) {
  var u = t.getBoundingClientRect(), r = u.top, i = u.left, n = u.width, o = u.height, a = t.cloneNode(), s = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0, c = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
  return a.removeAttribute("id"), a.style.position = "absolute", a.style.top = r + s + "px", a.style.left = i + c + "px", a.style.width = n + "px", a.style.height = o + "px", a.style.transform = "", a;
}, Qt = function(t, u) {
  var r = Nt({
    bubbles: !1,
    cancelable: !1,
    detail: void 0
  }, u);
  if (typeof window.CustomEvent == "function")
    return new CustomEvent(t, r);
  var i = document.createEvent("CustomEvent");
  return i.initCustomEvent(t, r.bubbles, r.cancelable, r.detail), i;
}, rf = function e(t) {
  var u = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = window.Promise || function(F) {
    function L() {
    }
    F(L, L);
  }, i = function(F) {
    var L = F.target;
    if (L === H) {
      p();
      return;
    }
    b.indexOf(L) !== -1 && C({ target: L });
  }, n = function() {
    if (!(y || !_.original)) {
      var F = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      Math.abs(E - F) > D.scrollOffset && setTimeout(p, 150);
    }
  }, o = function(F) {
    var L = F.key || F.keyCode;
    (L === "Escape" || L === "Esc" || L === 27) && p();
  }, a = function() {
    var F = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, L = F;
    if (F.background && (H.style.background = F.background), F.container && F.container instanceof Object && (L.container = Nt({}, D.container, F.container)), F.template) {
      var B = fn(F.template) ? F.template : document.querySelector(F.template);
      L.template = B;
    }
    return D = Nt({}, D, L), b.forEach(function(M) {
      M.dispatchEvent(Qt("medium-zoom:update", {
        detail: { zoom: G }
      }));
    }), G;
  }, s = function() {
    var F = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    return e(Nt({}, D, F));
  }, c = function() {
    for (var F = arguments.length, L = Array(F), B = 0; B < F; B++)
      L[B] = arguments[B];
    var M = L.reduce(function(T, $) {
      return [].concat(T, Gi($));
    }, []);
    return M.filter(function(T) {
      return b.indexOf(T) === -1;
    }).forEach(function(T) {
      b.push(T), T.classList.add("medium-zoom-image");
    }), A.forEach(function(T) {
      var $ = T.type, S = T.listener, W = T.options;
      M.forEach(function(J) {
        J.addEventListener($, S, W);
      });
    }), G;
  }, f = function() {
    for (var F = arguments.length, L = Array(F), B = 0; B < F; B++)
      L[B] = arguments[B];
    _.zoomed && p();
    var M = L.length > 0 ? L.reduce(function(T, $) {
      return [].concat(T, Gi($));
    }, []) : b;
    return M.forEach(function(T) {
      T.classList.remove("medium-zoom-image"), T.dispatchEvent(Qt("medium-zoom:detach", {
        detail: { zoom: G }
      }));
    }), b = b.filter(function(T) {
      return M.indexOf(T) === -1;
    }), G;
  }, l = function(F, L) {
    var B = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return b.forEach(function(M) {
      M.addEventListener("medium-zoom:" + F, L, B);
    }), A.push({ type: "medium-zoom:" + F, listener: L, options: B }), G;
  }, d = function(F, L) {
    var B = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return b.forEach(function(M) {
      M.removeEventListener("medium-zoom:" + F, L, B);
    }), A = A.filter(function(M) {
      return !(M.type === "medium-zoom:" + F && M.listener.toString() === L.toString());
    }), G;
  }, g = function() {
    var F = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, L = F.target, B = function() {
      var T = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      }, $ = void 0, S = void 0;
      if (D.container)
        if (D.container instanceof Object)
          T = Nt({}, T, D.container), $ = T.width - T.left - T.right - D.margin * 2, S = T.height - T.top - T.bottom - D.margin * 2;
        else {
          var W = fn(D.container) ? D.container : document.querySelector(D.container), J = W.getBoundingClientRect(), Q = J.width, fe = J.height, ue = J.left, Ie = J.top;
          T = Nt({}, T, {
            width: Q,
            height: fe,
            left: ue,
            top: Ie
          });
        }
      $ = $ || T.width - D.margin * 2, S = S || T.height - D.margin * 2;
      var ee = _.zoomedHd || _.original, gt = qi(ee) ? $ : ee.naturalWidth || $, $t = qi(ee) ? S : ee.naturalHeight || S, Re = ee.getBoundingClientRect(), Hu = Re.top, cu = Re.left, Ut = Re.width, qt = Re.height, kt = Math.min(Math.max(Ut, gt), $) / Ut, Gt = Math.min(Math.max(qt, $t), S) / qt, Ze = Math.min(kt, Gt), fu = (-cu + ($ - Ut) / 2 + D.margin + T.left) / Ze, du = (-Hu + (S - qt) / 2 + D.margin + T.top) / Ze, bt = "scale(" + Ze + ") translate3d(" + fu + "px, " + du + "px, 0)";
      _.zoomed.style.transform = bt, _.zoomedHd && (_.zoomedHd.style.transform = bt);
    };
    return new r(function(M) {
      if (L && b.indexOf(L) === -1) {
        M(G);
        return;
      }
      var T = function Q() {
        y = !1, _.zoomed.removeEventListener("transitionend", Q), _.original.dispatchEvent(Qt("medium-zoom:opened", {
          detail: { zoom: G }
        })), M(G);
      };
      if (_.zoomed) {
        M(G);
        return;
      }
      if (L)
        _.original = L;
      else if (b.length > 0) {
        var $ = b;
        _.original = $[0];
      } else {
        M(G);
        return;
      }
      if (_.original.dispatchEvent(Qt("medium-zoom:open", {
        detail: { zoom: G }
      })), E = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0, y = !0, _.zoomed = nf(_.original), document.body.appendChild(H), D.template) {
        var S = fn(D.template) ? D.template : document.querySelector(D.template);
        _.template = document.createElement("div"), _.template.appendChild(S.content.cloneNode(!0)), document.body.appendChild(_.template);
      }
      if (_.original.parentElement && _.original.parentElement.tagName === "PICTURE" && _.original.currentSrc && (_.zoomed.src = _.original.currentSrc), document.body.appendChild(_.zoomed), window.requestAnimationFrame(function() {
        document.body.classList.add("medium-zoom--opened");
      }), _.original.classList.add("medium-zoom-image--hidden"), _.zoomed.classList.add("medium-zoom-image--opened"), _.zoomed.addEventListener("click", p), _.zoomed.addEventListener("transitionend", T), _.original.getAttribute("data-zoom-src")) {
        _.zoomedHd = _.zoomed.cloneNode(), _.zoomedHd.removeAttribute("srcset"), _.zoomedHd.removeAttribute("sizes"), _.zoomedHd.removeAttribute("loading"), _.zoomedHd.src = _.zoomed.getAttribute("data-zoom-src"), _.zoomedHd.onerror = function() {
          clearInterval(W), console.warn("Unable to reach the zoom image target " + _.zoomedHd.src), _.zoomedHd = null, B();
        };
        var W = setInterval(function() {
          _.zoomedHd.complete && (clearInterval(W), _.zoomedHd.classList.add("medium-zoom-image--opened"), _.zoomedHd.addEventListener("click", p), document.body.appendChild(_.zoomedHd), B());
        }, 10);
      } else if (_.original.hasAttribute("srcset")) {
        _.zoomedHd = _.zoomed.cloneNode(), _.zoomedHd.removeAttribute("sizes"), _.zoomedHd.removeAttribute("loading");
        var J = _.zoomedHd.addEventListener("load", function() {
          _.zoomedHd.removeEventListener("load", J), _.zoomedHd.classList.add("medium-zoom-image--opened"), _.zoomedHd.addEventListener("click", p), document.body.appendChild(_.zoomedHd), B();
        });
      } else
        B();
    });
  }, p = function() {
    return new r(function(F) {
      if (y || !_.original) {
        F(G);
        return;
      }
      var L = function B() {
        _.original.classList.remove("medium-zoom-image--hidden"), document.body.removeChild(_.zoomed), _.zoomedHd && document.body.removeChild(_.zoomedHd), document.body.removeChild(H), _.zoomed.classList.remove("medium-zoom-image--opened"), _.template && document.body.removeChild(_.template), y = !1, _.zoomed.removeEventListener("transitionend", B), _.original.dispatchEvent(Qt("medium-zoom:closed", {
          detail: { zoom: G }
        })), _.original = null, _.zoomed = null, _.zoomedHd = null, _.template = null, F(G);
      };
      y = !0, document.body.classList.remove("medium-zoom--opened"), _.zoomed.style.transform = "", _.zoomedHd && (_.zoomedHd.style.transform = ""), _.template && (_.template.style.transition = "opacity 150ms", _.template.style.opacity = 0), _.original.dispatchEvent(Qt("medium-zoom:close", {
        detail: { zoom: G }
      })), _.zoomed.addEventListener("transitionend", L);
    });
  }, C = function() {
    var F = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, L = F.target;
    return _.original ? p() : g({ target: L });
  }, k = function() {
    return D;
  }, w = function() {
    return b;
  }, v = function() {
    return _.original;
  }, b = [], A = [], y = !1, E = 0, D = u, _ = {
    original: null,
    zoomed: null,
    zoomedHd: null,
    template: null
    // If the selector is omitted, it's replaced by the options
  };
  Object.prototype.toString.call(t) === "[object Object]" ? D = t : (t || typeof t == "string") && c(t), D = Nt({
    margin: 0,
    background: "#fff",
    scrollOffset: 40,
    container: null,
    template: null
  }, D);
  var H = uf(D.background);
  document.addEventListener("click", i), document.addEventListener("keyup", o), document.addEventListener("scroll", n), window.addEventListener("resize", p);
  var G = {
    open: g,
    close: p,
    toggle: C,
    update: a,
    clone: s,
    attach: c,
    detach: f,
    on: l,
    off: d,
    getOptions: k,
    getImages: w,
    getZoomedImage: v
  };
  return G;
};
function of(e, t) {
  t === void 0 && (t = {});
  var u = t.insertAt;
  if (!(typeof document > "u")) {
    var r = document.head || document.getElementsByTagName("head")[0], i = document.createElement("style");
    i.type = "text/css", u === "top" && r.firstChild ? r.insertBefore(i, r.firstChild) : r.appendChild(i), i.styleSheet ? i.styleSheet.cssText = e : i.appendChild(document.createTextNode(e));
  }
}
var af = ".medium-zoom-overlay{position:fixed;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity .3s;will-change:opacity}.medium-zoom--opened .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s cubic-bezier(.2,0,.2,1)!important}.medium-zoom-image--hidden{visibility:hidden}.medium-zoom-image--opened{position:relative;cursor:pointer;cursor:zoom-out;will-change:transform}";
of(af);
const Lt = {
  hljs: `${R}-hljs`,
  hlcss: `${R}-hlCss`,
  mermaidM: `${R}-mermaid-m`,
  mermaid: `${R}-mermaid`,
  katexjs: `${R}-katex`,
  katexcss: `${R}-katexCss`,
  echarts: `${R}-echarts`
}, sf = (e, {
  editorId: t,
  rootRef: u,
  setting: r
}) => {
  const i = rt.editorExtensions.highlight, n = rt.editorExtensionsAttrs.highlight;
  st("editorId", t), st("rootRef", u), st(
    "theme",
    N(() => e.theme)
  ), st(
    "language",
    N(() => e.language)
  ), st(
    "highlight",
    N(() => {
      const { js: a } = i, s = {
        ...Cr,
        ...i.css
      }, { js: c, css: f = {} } = n || {}, l = e.codeStyleReverse && e.codeStyleReverseList.includes(e.previewTheme) ? "dark" : e.theme, d = s[e.codeTheme] ? s[e.codeTheme][l] : Cr.atom[l], g = s[e.codeTheme] && f[e.codeTheme] ? f[e.codeTheme][l] : f.atom ? f.atom[l] : {};
      return {
        js: {
          src: a,
          ...c
        },
        css: {
          href: d,
          ...g
        }
      };
    })
  ), st("showCodeRowNumber", e.showCodeRowNumber);
  const o = N(() => {
    const a = {
      ...Hi,
      ...rt.editorConfig.languageUserDefined
    };
    return Zr(
      yu(Hi["en-US"]),
      a[e.language] || {}
    );
  });
  return st("usedLanguageText", o), st(
    "previewTheme",
    N(() => e.previewTheme)
  ), st(
    "customIcon",
    N(() => e.customIcon)
  ), st(
    "setting",
    N(() => r ? {
      // setting是reactive，不转化是可以直接赋值的
      ...r
    } : {
      preview: !0,
      htmlPreview: !1,
      previewOnly: !1,
      pageFullscreen: !1,
      fullscreen: !1
    })
  ), { editorId: t };
}, lf = (e) => {
  const t = La();
  return e.id || e.editorId || `${R}-${t}`;
}, cf = (e, t, u) => {
  const r = te("editorId"), i = te("rootRef"), n = te("usedLanguageText"), o = te("setting"), a = () => {
    i.value.querySelectorAll(`#${r} .${R}-preview .${R}-code`).forEach((f) => {
      let l = -1;
      const d = f.querySelector(
        `.${R}-copy-button:not([data-processed])`
      );
      d && (d.onclick = (g) => {
        g.preventDefault(), clearTimeout(l);
        const p = (f.querySelector("input:checked + pre code") || f.querySelector("pre code")).textContent, { text: C, successTips: k, failTips: w } = n.value.copyCode;
        let v = k;
        ta(e.formatCopiedText(p || "")).catch(() => {
          v = w;
        }).finally(() => {
          d.dataset.isIcon ? d.dataset.tips = v : d.innerHTML = v, l = window.setTimeout(() => {
            d.dataset.isIcon ? d.dataset.tips = C : d.innerHTML = C;
          }, 1500);
        });
      }, d.setAttribute("data-processed", "true"));
    });
  }, s = () => {
    nt(a);
  }, c = (f) => {
    f && nt(a);
  };
  ce([t, u], s), ce(() => o.value.preview, c), ce(() => o.value.htmlPreview, c), _e(a);
}, ff = (e) => {
  const t = te("editorId"), u = te("theme"), r = te("rootRef"), { editorExtensions: i, editorExtensionsAttrs: n } = rt;
  let o = i.echarts.instance;
  const a = Ru(-1), s = () => {
    !e.noEcharts && o && (a.value = a.value + 1);
  };
  ce(
    () => u.value,
    () => {
      s();
    }
  ), _e(() => {
    var C;
    if (e.noEcharts || o)
      return;
    const p = i.echarts.js;
    Mt(
      "script",
      {
        ...(C = n.echarts) == null ? void 0 : C.js,
        src: p,
        id: Lt.echarts,
        onload() {
          o = window.echarts, s();
        }
      },
      "echarts"
    );
  });
  let c = [], f = [], l = [];
  const d = (p = !1) => {
    if (!c.length) {
      p && (f.forEach((v) => {
        var b;
        (b = v.dispose) == null || b.call(v);
      }), l.forEach((v) => {
        var b;
        (b = v.disconnect) == null || b.call(v);
      }), f = [], l = []);
      return;
    }
    const C = [], k = [], w = [];
    c.forEach((v, b) => {
      var E, D;
      const A = f[b], y = l[b];
      if (p || !v || !v.isConnected || r != null && r.value && !r.value.contains(v)) {
        (E = A == null ? void 0 : A.dispose) == null || E.call(A), (D = y == null ? void 0 : y.disconnect) == null || D.call(y);
        return;
      }
      C.push(v), A && k.push(A), y && w.push(y);
    }), c = C, f = k, l = w;
  }, g = () => {
    d(), !e.noEcharts && o && Array.from(
      r.value.querySelectorAll(
        `#${t} div.${R}-echarts:not([data-processed])`
      )
    ).forEach((p) => {
      if (p.dataset.closed === "false")
        return !1;
      try {
        const C = new Function(`return ${p.innerText}`)(), k = o.init(p, u.value);
        k.setOption(C), p.setAttribute("data-processed", ""), c.push(p), f.push(k);
        const w = new ResizeObserver(() => {
          k.resize();
        });
        w.observe(p), l.push(w);
      } catch (C) {
        Ge.emit(t, _r, {
          name: "echarts",
          message: C == null ? void 0 : C.message,
          error: C
        });
      }
    });
  };
  return Bu(() => {
    d(!0);
  }), { reRenderEcharts: a, replaceEcharts: g };
}, df = (e) => {
  const t = te("highlight"), u = Ru(rt.editorExtensions.highlight.instance);
  return _e(() => {
    e.noHighlight || u.value || (Mt("link", {
      ...t.value.css,
      rel: "stylesheet",
      id: Lt.hlcss
    }), Mt(
      "script",
      {
        ...t.value.js,
        id: Lt.hljs,
        onload() {
          u.value = window.hljs;
        }
      },
      "hljs"
    ));
  }), ce(
    () => t.value.css,
    () => {
      e.noHighlight || rt.editorExtensions.highlight.instance || P0("link", {
        ...t.value.css,
        rel: "stylesheet",
        id: Lt.hlcss
      });
    }
  ), u;
}, hf = (e) => {
  const t = Ru(rt.editorExtensions.katex.instance);
  return _e(() => {
    var i, n;
    if (e.noKatex || t.value)
      return;
    const { editorExtensions: u, editorExtensionsAttrs: r } = rt;
    Mt(
      "script",
      {
        ...(i = r.katex) == null ? void 0 : i.js,
        src: u.katex.js,
        id: Lt.katexjs,
        onload() {
          t.value = window.katex;
        }
      },
      "katex"
    ), Mt("link", {
      ...(n = r.katex) == null ? void 0 : n.css,
      rel: "stylesheet",
      href: u.katex.css,
      id: Lt.katexcss
    });
  }), t;
}, dn = new ef({
  max: 1e3,
  // 缓存10分钟
  ttl: 6e5
}), pf = (e) => {
  const t = te("editorId"), u = te("theme"), r = te("rootRef"), { editorExtensions: i, editorExtensionsAttrs: n, mermaidConfig: o } = rt;
  let a = i.mermaid.instance;
  const s = Ru(-1), c = () => {
    if (!e.noMermaid && a) {
      const f = u.value === "dark" ? {
        startOnLoad: !1,
        theme: "dark"
      } : {
        startOnLoad: !1,
        theme: "base",
        themeVariables: {
          background: "#ffffff",
          primaryColor: "#ffffff",
          primaryTextColor: "#1f2329",
          primaryBorderColor: "#b7c0cc",
          secondaryColor: "#f7f8fa",
          tertiaryColor: "#f7f8fa",
          lineColor: "#596273",
          edgeLabelBackground: "#ffffff",
          clusterBkg: "#ffffff",
          clusterBorder: "#b7c0cc"
        }
      };
      a.initialize(o(f)), s.value = s.value + 1;
    }
  };
  return ce(
    () => u.value,
    () => {
      dn.clear(), c();
    }
  ), _e(() => {
    var l, d;
    if (e.noMermaid || a)
      return;
    const f = i.mermaid.js;
    /\.mjs/.test(f) ? (Mt("link", {
      ...(l = n.mermaid) == null ? void 0 : l.js,
      rel: "modulepreload",
      href: f,
      id: Lt.mermaidM
    }), import(
      /* @vite-ignore */
      /* webpackIgnore: true */
      f
    ).then((g) => {
      a = g.default, c();
    }).catch((g) => {
      Ge.emit(t, _r, {
        name: "mermaid",
        message: `Failed to load mermaid module: ${g.message}`,
        error: g
      });
    })) : Mt(
      "script",
      {
        ...(d = n.mermaid) == null ? void 0 : d.js,
        src: f,
        id: Lt.mermaid,
        onload() {
          a = window.mermaid, c();
        }
      },
      "mermaid"
    );
  }), { reRenderRef: s, replaceMermaid: async () => {
    if (!e.noMermaid && a) {
      const f = r.value.querySelectorAll(
        `div.${R}-mermaid`
      ), l = document.createElement("div"), d = document.body.offsetWidth > 1366 ? document.body.offsetWidth : 1366, g = document.body.offsetHeight > 768 ? document.body.offsetHeight : 768;
      l.style.width = d + "px", l.style.height = g + "px", l.style.position = "fixed", l.style.zIndex = "-10000", l.style.top = "-10000";
      let p = f.length;
      p > 0 && document.body.appendChild(l), await Promise.allSettled(
        Array.from(f).map((C) => (async (k) => {
          var b;
          if (k.dataset.closed === "false")
            return !1;
          const w = k.innerText;
          let v = dn.get(w);
          if (!v) {
            const A = Ar();
            let y = { svg: "" };
            try {
              y = await a.render(A, w, l), v = await e.sanitizeMermaid(y.svg);
              const E = document.createElement("p");
              E.className = `${R}-mermaid`, E.setAttribute("data-processed", ""), E.setAttribute("data-content", w), E.innerHTML = v, (b = E.children[0]) == null || b.removeAttribute("height"), dn.set(w, E.innerHTML), k.dataset.line !== void 0 && (E.dataset.line = k.dataset.line), k.replaceWith(E);
            } catch (E) {
              Ge.emit(t, _r, {
                name: "mermaid",
                message: E.message,
                error: E
              });
            }
            --p === 0 && l.remove();
          }
        })(C))
      );
    }
  } };
}, mf = (e, t) => {
  t = t || {};
  const u = 3, r = t.marker || "!", i = r.charCodeAt(0), n = r.length;
  let o = "", a = "";
  const s = (f, l, d, g, p) => {
    const C = f[l];
    return C.type === "admonition_open" ? f[l].attrPush([
      "class",
      `${R}-admonition ${R}-admonition-${C.info}`
    ]) : C.type === "admonition_title_open" && f[l].attrPush(["class", `${R}-admonition-title`]), p.renderToken(f, l, d);
  }, c = (f) => {
    const l = f.trim().split(" ", 2);
    a = "", o = l[0], l.length > 1 && (a = f.substring(o.length + 2));
  };
  e.block.ruler.before(
    "code",
    "admonition",
    (f, l, d, g) => {
      let p, C, k, w = !1, v = f.bMarks[l] + f.tShift[l], b = f.eMarks[l];
      if (i !== f.src.charCodeAt(v))
        return !1;
      for (p = v + 1; p <= b && r[(p - v) % n] === f.src[p]; p++)
        ;
      const A = Math.floor((p - v) / n);
      if (A !== u)
        return !1;
      p -= (p - v) % n;
      const y = f.src.slice(v, p), E = f.src.slice(p, b);
      if (c(E), g)
        return !0;
      for (C = l; C++, !(C >= d || (v = f.bMarks[C] + f.tShift[C], b = f.eMarks[C], v < b && f.sCount[C] < f.blkIndent)); )
        if (i === f.src.charCodeAt(v) && !(f.sCount[C] - f.blkIndent >= 4)) {
          for (p = v + 1; p <= b && r[(p - v) % n] === f.src[p]; p++)
            ;
          if (!(Math.floor((p - v) / n) < A) && (p -= (p - v) % n, p = f.skipSpaces(p), !(p < b))) {
            w = !0;
            break;
          }
        }
      const D = f.parentType, _ = f.lineMax;
      return f.parentType = "root", f.lineMax = C, k = f.push("admonition_open", "div", 1), k.markup = y, k.block = !0, k.info = o, k.map = [l, C], a && (k = f.push("admonition_title_open", "p", 1), k.markup = y + " " + o, k.map = [l, C], k = f.push("inline", "", 0), k.content = a, k.map = [l, f.line - 1], k.children = [], k = f.push("admonition_title_close", "p", -1), k.markup = y + " " + o), f.md.block.tokenize(f, l + 1, C), k = f.push("admonition_close", "div", -1), k.markup = f.src.slice(v, p), k.block = !0, f.parentType = D, f.lineMax = _, f.line = C + (w ? 1 : 0), !0;
    },
    {
      alt: ["paragraph", "reference", "blockquote", "list"]
    }
  ), e.renderer.rules.admonition_open = s, e.renderer.rules.admonition_title_open = s, e.renderer.rules.admonition_title_close = s, e.renderer.rules.admonition_close = s;
}, Sr = (e, t) => {
  const u = e.attrs ? e.attrs.slice() : [];
  return t.forEach((r) => {
    const i = e.attrIndex(r[0]);
    i < 0 ? u.push(r) : (u[i] = u[i].slice(), u[i][1] += ` ${r[1]}`);
  }), u;
}, gf = (e, t) => {
  const u = e.renderer.rules.fence, r = e.utils.unescapeAll, i = /\[(\w*)(?::([\w ]*))?\]/, n = /::(open|close)/, o = (l) => l.info ? r(l.info).trim() : "", a = (l) => {
    const d = o(l), [g = null, p = ""] = (i.exec(d) || []).slice(1);
    return [g, p];
  }, s = (l) => {
    const d = o(l);
    return d ? d.split(/(\s+)/g)[0] : "";
  }, c = (l) => {
    const d = l.info.match(n) || [], g = d[1] === "open" || d[1] !== "close" && t.codeFoldable && l.content.trim().split(`
`).length < t.autoFoldThreshold, p = d[1] || t.codeFoldable ? "details" : "div", C = d[1] || t.codeFoldable ? "summary" : "div";
    return { open: g, tagContainer: p, tagHeader: C };
  }, f = (l, d, g, p, C) => {
    var $;
    if (l[d].hidden)
      return "";
    const k = ($ = t.usedLanguageTextRef.value) == null ? void 0 : $.copyCode.text, w = t.customIconRef.value.copy || k, v = !!t.customIconRef.value.copy, b = `<span class="${R}-collapse-tips">${ct("collapse-tips", t.customIconRef.value)}</span>`, [A] = a(l[d]);
    if (A === null) {
      const { open: S, tagContainer: W, tagHeader: J } = c(l[d]), Q = [["class", `${R}-code`]];
      S && Q.push(["open", ""]);
      const fe = {
        attrs: Sr(l[d], Q)
      };
      l[d].info = l[d].info.replace(n, "");
      const ue = u(l, d, g, p, C);
      return `
        <${W} ${C.renderAttrs(fe)}>
          <${J} class="${R}-code-head">
            <div class="${R}-code-flag"><span></span><span></span><span></span></div>
            <div class="${R}-code-action">
              <span class="${R}-code-lang">${e.utils.escapeHtml(l[d].info.trim())}</span>
              <span class="${R}-copy-button" data-tips="${k}"${v ? " data-is-icon=true" : ""}>${w}</span>
              ${t.extraTools instanceof Function ? t.extraTools({ lang: l[d].info.trim() }) : t.extraTools || ""}
              ${W === "details" ? b : ""}
            </div>
          </${J}>
          ${ue}
        </${W}>
      `;
    }
    let y, E, D, _, H = "", G = "", P = "";
    const { open: F, tagContainer: L, tagHeader: B } = c(l[d]), M = [["class", `${R}-code`]];
    F && M.push(["open", ""]);
    const T = {
      attrs: Sr(l[d], M)
    };
    for (let S = d; S < l.length && (y = l[S], [E, D] = a(y), E === A); S++) {
      y.info = y.info.replace(i, "").replace(n, ""), y.hidden = !0;
      const W = `${R}-codetab-${t.editorId}-${d}-${S - d}`;
      _ = S - d > 0 ? "" : "checked", H += `
        <li>
          <input
            type="radio"
            id="label-${R}-codetab-label-1-${t.editorId}-${d}-${S - d}"
            name="${R}-codetab-label-${t.editorId}-${d}"
            class="${W}"
            ${_}
          >
          <label
            for="label-${R}-codetab-label-1-${t.editorId}-${d}-${S - d}"
            onclick="this.getRootNode().querySelectorAll('.${W}').forEach(e => e.click())"
          >
            ${e.utils.escapeHtml(D || s(y))}
          </label>
        </li>`, G += `
        <div role="tabpanel">
          <input
            type="radio"
            name="${R}-codetab-pre-${t.editorId}-${d}"
            class="${W}"
            ${_}
            role="presentation">
          ${u(l, S, g, p, C)}
        </div>`, P += `
        <input
          type="radio"
          name="${R}-codetab-lang-${t.editorId}-${d}"
          class="${W}"
          ${_}
          role="presentation">
        <span class=${R}-code-lang role="note">${e.utils.escapeHtml(s(y))}</span>`;
    }
    return `
      <${L} ${C.renderAttrs(T)}>
        <${B} class="${R}-code-head">
          <div class="${R}-code-flag">
            <ul class="${R}-codetab-label" role="tablist">${H}</ul>
          </div>
          <div class="${R}-code-action">
            <span class="${R}-codetab-lang">${P}</span>
            <span class="${R}-copy-button" data-tips="${k}"${v ? " data-is-icon=true" : ""}>${w}</span>
            ${t.extraTools instanceof Function ? t.extraTools({ lang: l[d].info.trim() }) : t.extraTools || ""}
            ${L === "details" ? b : ""}
          </div>
        </${B}>
        ${G}
      </${L}>
    `;
  };
  e.renderer.rules.fence = f, e.renderer.rules.code_block = f;
}, bf = (e, t) => {
  const u = e.renderer.rules.fence.bind(e.renderer.rules);
  e.renderer.rules.fence = (r, i, n, o, a) => {
    var f, l;
    const s = r[i], c = s.content.trim();
    if (s.info === "echarts") {
      if (s.attrSet("class", `${R}-echarts`), s.attrSet("data-echarts-theme", t.themeRef.value), s.map && s.level === 0) {
        const d = s.map[1] - 1, g = !!((l = (f = o.srcLines[d]) == null ? void 0 : f.trim()) != null && l.startsWith("```"));
        s.attrSet("data-closed", `${g}`), s.attrSet("data-line", String(s.map[0]));
      }
      return `<div ${a.renderAttrs(s)} style="width: 100%; aspect-ratio: 4 / 3;">${e.utils.escapeHtml(c)}</div>`;
    }
    return u(r, i, n, o, a);
  };
}, vf = (e, t) => {
  e.renderer.rules.heading_open = (u, r) => {
    var a;
    const i = u[r], n = ((a = u[r + 1].children) == null ? void 0 : a.reduce((s, c) => s + (["text", "code_inline", "math_inline"].includes(c.type) && c.content || ""), "")) || "", o = i.markup.length;
    return t.headsRef.value.push({
      text: n,
      level: o,
      line: i.map[0],
      currentToken: i,
      nextToken: u[r + 1]
    }), i.map && i.level === 0 && i.attrSet(
      "id",
      t.mdHeadingId({
        text: n,
        level: o,
        index: t.headsRef.value.length,
        currentToken: i,
        nextToken: u[r + 1]
      })
    ), e.renderer.renderToken(u, r, t);
  }, e.renderer.rules.heading_close = (u, r, i, n, o) => o.renderToken(u, r, i);
}, Wi = {
  block: [
    { open: "$$", close: "$$" },
    { open: "\\[", close: "\\]" }
  ],
  inline: [
    { open: "$$", close: "$$" },
    { open: "$", close: "$" },
    { open: "\\[", close: "\\]" },
    { open: "\\(", close: "\\)" }
  ]
}, xf = (e) => (t, u) => {
  const r = e.delimiters;
  for (const i of r) {
    if (!t.src.startsWith(i.open, t.pos))
      continue;
    const n = t.pos + i.open.length;
    let o = n;
    for (; (o = t.src.indexOf(i.close, o)) !== -1; ) {
      let a = 0, s = o - 1;
      for (; s >= 0 && t.src[s] === "\\"; )
        a++, s--;
      if (a % 2 === 0)
        break;
      o += i.close.length;
    }
    if (o !== -1) {
      if (o - n === 0)
        return u || (t.pending += i.open + i.close), t.pos = o + i.close.length, !0;
      if (!u) {
        const a = t.push("math_inline", "math", 0);
        a.markup = i.open, a.content = t.src.slice(n, o);
      }
      return t.pos = o + i.close.length, !0;
    }
  }
  return !1;
}, yf = (e) => (t, u, r, i) => {
  const n = e.delimiters, o = t.bMarks[u] + t.tShift[u], a = t.eMarks[u], s = (c, f, l) => {
    t.line = f;
    const d = t.push("math_block", "math", 0);
    return d.block = !0, d.content = c, d.map = [u, t.line], d.markup = l, !0;
  };
  for (const c of n) {
    const f = o;
    if (t.src.slice(f, f + c.open.length) !== c.open)
      continue;
    const l = f + c.open.length, d = t.src.slice(l, a).trim(), g = d === "", p = d === c.close, C = d.endsWith(c.close);
    if (!g && !p && !C)
      continue;
    if (i)
      return !0;
    if (p)
      return s("", u + 1, c.open);
    if (!g && C) {
      const A = d.slice(0, -c.close.length);
      return s(A, u + 1, c.open);
    }
    let k = u + 1, w = !1, v = "";
    for (; k < r; k++) {
      const A = t.bMarks[k] + t.tShift[k], y = t.eMarks[k];
      if (A < y && t.tShift[k] < t.blkIndent)
        break;
      if (t.src.slice(A, y).trim().endsWith(c.close)) {
        const E = t.src.slice(0, y).lastIndexOf(c.close);
        v = t.src.slice(A, E), w = !0;
        break;
      }
    }
    if (!w)
      continue;
    const b = t.getLines(u + 1, k, t.tShift[u], !0) + (v.trim() ? v : "");
    return s(b, k + 1, c.open);
  }
  return !1;
}, Af = (e, { katexRef: t, inlineDelimiters: u, blockDelimiters: r }) => {
  const i = (a, s, c, f, l = !1) => {
    const d = {
      attrs: Sr(a, [["class", s]])
    }, g = f.renderAttrs(d);
    if (!t.value)
      return `<${c} ${g}>${a.content}</${c}>`;
    const p = t.value.renderToString(
      a.content,
      rt.katexConfig({
        throwOnError: !1,
        displayMode: l
      })
    );
    return `<${c} ${g} data-processed>${p}</${c}>`;
  }, n = (a, s, c, f, l) => i(a[s], `${R}-katex-inline`, "span", l), o = (a, s, c, f, l) => i(a[s], `${R}-katex-block`, "p", l, !0);
  e.inline.ruler.before(
    "escape",
    "math_inline",
    xf({
      delimiters: u || Wi.inline
    })
  ), e.block.ruler.after(
    "blockquote",
    "math_block",
    yf({
      delimiters: r || Wi.block
    }),
    {
      alt: ["paragraph", "reference", "blockquote", "list"]
    }
  ), e.renderer.rules.math_inline = n, e.renderer.rules.math_block = o;
}, kf = (e, t) => {
  const u = e.renderer.rules.fence.bind(e.renderer.rules);
  e.renderer.rules.fence = (r, i, n, o, a) => {
    var f, l;
    const s = r[i], c = s.content.trim();
    if (s.info === "mermaid") {
      if (s.attrSet("class", `${R}-mermaid`), s.attrSet("data-mermaid-theme", t.themeRef.value), s.map && s.level === 0) {
        const g = s.map[1] - 1, p = !!((l = (f = o.srcLines[g]) == null ? void 0 : f.trim()) != null && l.startsWith("```"));
        s.attrSet("data-closed", `${p}`), s.attrSet("data-line", String(s.map[0]));
      }
      const d = dn.get(c);
      return d ? (s.attrSet("data-processed", ""), s.attrSet("data-content", c), `<p ${a.renderAttrs(s)}>${d}</p>`) : `<div ${a.renderAttrs(s)}>${e.utils.escapeHtml(c)}</div>`;
    }
    return u(r, i, n, o, a);
  };
}, Zi = (e, t, u) => {
  const r = e.attrIndex(t), i = [t, u];
  r < 0 ? e.attrPush(i) : (e.attrs = e.attrs || [], e.attrs[r] = i);
}, Cf = (e) => e.type === "inline", _f = (e) => e.type === "paragraph_open", wf = (e) => e.type === "list_item_open", Ef = (e) => e.content.indexOf("[ ] ") === 0 || e.content.indexOf("[x] ") === 0 || e.content.indexOf("[X] ") === 0, Ff = (e, t) => Cf(e[t]) && _f(e[t - 1]) && wf(e[t - 2]) && Ef(e[t]), Df = (e, t) => {
  const u = e[t].level - 1;
  for (let r = t - 1; r >= 0; r--)
    if (e[r].level === u)
      return r;
  return -1;
}, Tf = (e) => {
  const t = new e("html_inline", "", 0);
  return t.content = "<label>", t;
}, Sf = (e) => {
  const t = new e("html_inline", "", 0);
  return t.content = "</label>", t;
}, Lf = (e, t, u) => {
  const r = new u("html_inline", "", 0);
  return r.content = '<label class="task-list-item-label" for="' + t + '">' + e + "</label>", r.attrs = [["for", t]], r;
}, If = (e, t, u) => {
  const r = new t("html_inline", "", 0), i = u.enabled ? " " : ' disabled="" ';
  return e.content.indexOf("[ ] ") === 0 ? r.content = '<input class="task-list-item-checkbox"' + i + 'type="checkbox">' : (e.content.indexOf("[x] ") === 0 || e.content.indexOf("[X] ") === 0) && (r.content = '<input class="task-list-item-checkbox" checked=""' + i + 'type="checkbox">'), r;
}, Of = (e, t, u) => {
  if (e.children = e.children || [], e.children.unshift(If(e, t, u)), e.children[1].content = e.children[1].content.slice(3), e.content = e.content.slice(3), u.label)
    if (u.labelAfter) {
      e.children.pop();
      const r = "task-item-" + Math.ceil(Math.random() * (1e4 * 1e3) - 1e3);
      e.children[0].content = e.children[0].content.slice(0, -1) + ' id="' + r + '">', e.children.push(Lf(e.content, r, t));
    } else
      e.children.unshift(Tf(t)), e.children.push(Sf(t));
}, Mf = (e, t = {}) => {
  e.core.ruler.after("inline", "github-task-lists", (u) => {
    const r = u.tokens;
    for (let i = 2; i < r.length; i++)
      Ff(r, i) && (Of(r[i], u.Token, t), Zi(
        r[i - 2],
        "class",
        "task-list-item" + (t.enabled ? " enabled" : " ")
      ), Zi(r[Df(r, i - 2)], "class", "contains-task-list"));
  });
}, Rf = (e) => {
  e.core.ruler.push("init-line-number", (t) => (t.tokens.forEach((u) => {
    u.map && (u.attrs || (u.attrs = []), u.attrs.push(["data-line", u.map[0].toString()]));
  }), !0));
}, Bf = (e, t) => {
  const { editorConfig: u, markdownItPlugins: r } = rt, i = te("editorId"), n = te("language"), o = te(
    "usedLanguageText"
  ), a = te("showCodeRowNumber"), s = te("theme"), c = te("customIcon"), f = te("rootRef"), l = te("setting"), d = V([]), g = df(e), p = hf(e), { reRenderRef: C, replaceMermaid: k } = pf(e), { reRenderEcharts: w, replaceEcharts: v } = ff(e), b = Ue({
    html: !0,
    breaks: !0,
    linkify: !0
  }), A = [
    {
      type: "image",
      plugin: q0,
      options: { figcaption: !0, classes: "md-zoom" }
    },
    {
      type: "admonition",
      plugin: mf,
      options: {}
    },
    {
      type: "taskList",
      plugin: Mf,
      options: {}
    },
    {
      type: "heading",
      plugin: vf,
      options: { mdHeadingId: e.mdHeadingId, headsRef: d }
    },
    {
      type: "code",
      plugin: gf,
      options: {
        editorId: i,
        usedLanguageTextRef: o,
        // showCodeRowNumber,
        codeFoldable: e.codeFoldable,
        autoFoldThreshold: e.autoFoldThreshold,
        customIconRef: c
      }
    },
    {
      type: "sub",
      plugin: Z0,
      options: {}
    },
    {
      type: "sup",
      plugin: Y0,
      options: {}
    }
  ];
  e.noKatex || A.push({
    type: "katex",
    plugin: Af,
    options: { katexRef: p }
  }), e.noMermaid || A.push({
    type: "mermaid",
    plugin: kf,
    options: { themeRef: s }
  }), e.noEcharts || A.push({
    type: "echarts",
    plugin: bf,
    options: { themeRef: s }
  }), r(A, {
    editorId: i
  }).forEach((M) => {
    b.use(M.plugin, M.options);
  });
  const y = b.options.highlight;
  b.set({
    highlight: (M, T, $) => {
      if (y) {
        const J = y(M, T, $);
        if (J)
          return J;
      }
      let S;
      !e.noHighlight && g.value ? g.value.getLanguage(T) ? S = g.value.highlight(M, {
        language: T,
        ignoreIllegals: !0
      }).value : S = g.value.highlightAuto(M).value : S = b.utils.escapeHtml(M);
      const W = a ? z0(
        S.replace(/^\n+|\n+$/g, ""),
        M.replace(/^\n+|\n+$/g, "")
      ) : `<span class="${R}-code-block">${S.replace(/^\n+|\n+$/g, "")}</span>`;
      return `<pre><code class="language-${T}" language=${T}>${W}</code></pre>`;
    }
  }), Rf(b);
  const E = V(`_article-key_${Ar()}`), D = V(
    e.sanitize(
      b.render(e.modelValue, {
        srcLines: e.modelValue.split(`
`)
      })
    )
  );
  let _ = () => {
  }, H = () => {
  };
  const G = () => {
    var T;
    const M = (T = f.value) == null ? void 0 : T.querySelectorAll(
      `#${i} p.${R}-mermaid:not([data-closed=false])`
    );
    H(), H = H0(M, {
      customIcon: c.value
    }), _(), _ = $0(M, {
      customIcon: c.value
    });
  }, P = () => {
    Ge.emit(i, O0, D.value), e.onHtmlChanged(D.value), e.onGetCatalog(d.value), Ge.emit(i, ir, d.value), nt(() => {
      k().then(G), v();
    });
  }, F = () => {
    d.value = [], D.value = e.sanitize(
      b.render(e.modelValue, {
        srcLines: e.modelValue.split(`
`)
      })
    );
  }, L = N(() => (e.noKatex || !!p.value) && (e.noHighlight || !!g.value));
  let B = -1;
  return ce([Mr(e, "modelValue"), L, C, n], () => {
    B = window.setTimeout(
      () => {
        F();
      },
      t ? 0 : u.renderDelay
    );
  }), ce(
    () => l.value.preview,
    () => {
      l.value.preview && nt(() => {
        k().then(G), v(), Ge.emit(i, ir, d.value);
      });
    }
  ), ce([D, w], () => {
    P();
  }), _e(P), _e(() => {
    Ge.on(i, {
      name: M0,
      callback() {
        Ge.emit(i, ir, d.value);
      }
    }), Ge.on(i, {
      name: ea,
      callback: () => {
        E.value = `_article-key_${Ar()}`, F();
      }
    });
  }), Bu(() => {
    _(), H(), clearTimeout(B);
  }), { html: D, key: E };
}, zf = (e, t) => {
  const u = te("editorId"), r = te("setting"), { noImgZoomIn: i } = e, n = C0(() => {
    const o = document.querySelectorAll(
      `#${u}-preview img:not(.not-zoom):not(.medium-zoom-image)`
    );
    o.length !== 0 && rf(o, {
      background: "#00000073"
    });
  });
  _e(async () => {
    !i && r.value.preview && await n();
  }), ce([t, () => r.value.preview], async () => {
    !i && r.value.preview && await n();
  });
}, Vi = {
  checked: {
    regexp: /- \[x\]/,
    value: "- [ ]"
  },
  unChecked: {
    regexp: /- \[\s\]/,
    value: "- [x]"
  }
}, Nf = (e, t) => {
  const u = te("editorId"), r = te("rootRef");
  let i = () => {
  };
  const n = () => {
    if (!r.value)
      return !1;
    const o = r.value.querySelectorAll(".task-list-item.enabled"), a = (s) => {
      var p;
      s.preventDefault();
      const c = s.target.checked ? "unChecked" : "checked", f = (p = s.target.parentElement) == null ? void 0 : p.dataset.line;
      if (!f)
        return;
      const l = Number(f), d = e.modelValue.split(`
`), g = d[Number(l)].replace(
        Vi[c].regexp,
        Vi[c].value
      );
      e.previewOnly ? (d[Number(l)] = g, e.onChange(d.join(`
`))) : Ge.emit(u, R0, l + 1, g);
    };
    o.forEach((s) => {
      s.addEventListener("click", a);
    }), i = () => {
      o.forEach((s) => {
        s.removeEventListener("click", a);
      });
    };
  };
  Bu(() => {
    i();
  }), ce(
    [t],
    () => {
      i(), nt(n);
    },
    {
      immediate: !0
    }
  );
}, Pf = (e, t, u) => {
  const r = te("setting"), i = () => {
    nt(() => {
      var o;
      (o = e.onRemount) == null || o.call(e);
    });
  }, n = (o) => {
    o && i();
  };
  ce([t, u], i), ce(() => r.value.preview, n), ce(() => r.value.htmlPreview, n), _e(i);
}, sa = {
  modelValue: {
    type: String,
    default: ""
  },
  onChange: {
    type: Function,
    default: () => {
    }
  },
  onHtmlChanged: {
    type: Function,
    default: () => {
    }
  },
  onGetCatalog: {
    type: Function,
    default: () => {
    }
  },
  mdHeadingId: {
    type: Function,
    default: () => ""
  },
  noMermaid: {
    type: Boolean,
    default: !1
  },
  sanitize: {
    type: Function,
    default: (e) => e
  },
  // 不使用该函数功能
  noKatex: {
    type: Boolean,
    default: !1
  },
  formatCopiedText: {
    type: Function,
    default: (e) => e
  },
  noHighlight: {
    type: Boolean,
    default: !1
  },
  previewOnly: {
    type: Boolean,
    default: !1
  },
  noImgZoomIn: {
    type: Boolean
  },
  sanitizeMermaid: {
    type: Function
  },
  codeFoldable: {
    type: Boolean
  },
  autoFoldThreshold: {
    type: Number
  },
  onRemount: {
    type: Function
  },
  noEcharts: {
    type: Boolean
  },
  previewComponent: {
    type: [Object, Function],
    default: void 0
  }
};
({
  ...sa
});
const Xi = (e) => {
  const t = new DOMParser().parseFromString(e, "text/html");
  return Array.from(t.body.childNodes);
}, jf = (e, t) => e.nodeType !== t.nodeType ? !1 : e.nodeType === Node.TEXT_NODE || e.nodeType === Node.COMMENT_NODE ? e.textContent === t.textContent : e.nodeType === Node.ELEMENT_NODE ? e.outerHTML === t.outerHTML : e.isEqualNode ? e.isEqualNode(t) : !1, Hf = /* @__PURE__ */ Y({
  name: "UpdateOnDemand",
  props: {
    id: {
      type: String,
      required: !0
    },
    class: {
      type: [String, Array, Object],
      required: !0
    },
    html: {
      type: String,
      required: !0
    }
  },
  setup(e) {
    const t = V(), u = e.html, r = (i, n) => {
      if (!t.value) return;
      const o = t.value, a = Array.from(o.childNodes), s = Math.min(i.length, n.length);
      let c = -1;
      for (let l = 0; l < s; l++)
        if (!jf(i[l], n[l])) {
          c = l;
          break;
        }
      if (c === -1)
        if (n.length > i.length)
          c = i.length;
        else if (i.length > n.length)
          c = n.length;
        else
          return;
      const f = Math.min(c, a.length);
      for (let l = a.length - 1; l >= f; l--)
        a[l].remove();
      for (let l = c; l < i.length; l++)
        o.appendChild(i[l].cloneNode(!0));
    };
    return ce(() => e.html, (i, n) => {
      const o = Xi(i), a = Xi(n || "");
      r(o, a);
    }), () => h("div", {
      id: e.id,
      class: e.class,
      innerHTML: u,
      ref: t
    }, null);
  }
}), $f = /* @__PURE__ */ Y({
  name: "ContentPreview",
  props: sa,
  setup(e) {
    const t = te("editorId"), u = te("setting"), r = te("previewTheme"), i = te("showCodeRowNumber"), {
      html: n,
      key: o
    } = Bf(e, e.previewOnly);
    cf(e, n, o), zf(e, n), Nf(e, n), Pf(e, n, o);
    const a = N(() => [`${R}-preview`, `${r == null ? void 0 : r.value}-theme`, i && `${R}-scrn`].filter(Boolean)), s = () => {
      const c = `${t}-preview`;
      return e.previewComponent ? Fu(e.previewComponent, {
        key: o.value,
        html: n.value,
        id: c,
        class: a.value
      }) : h(Hf, {
        key: o.value,
        html: n.value,
        id: c,
        class: a.value
      }, null);
    };
    return () => h(ut, null, [u.value.preview && (e.previewOnly ? s() : h("div", {
      id: `${t}-preview-wrapper`,
      class: `${R}-preview-wrapper`,
      key: "content-preview-wrapper"
    }, [s()])), u.value.htmlPreview && h("div", {
      id: `${t}-html-wrapper`,
      class: `${R}-preview-wrapper`,
      key: "html-preview-wrapper"
    }, [h("div", {
      class: `${R}-html`
    }, [n.value])])]);
  }
}), Uf = ({ text: e }) => e, la = {
  /**
   * markdown content.
   *
   * @default ''
   */
  modelValue: {
    type: String,
    default: ""
  },
  /**
   * input回调事件
   */
  onChange: {
    type: Function,
    default: void 0
  },
  /**
   * 主题，支持light和dark
   *
   * @default 'light'
   */
  theme: {
    type: String,
    default: "light"
  },
  /**
   * 外层类名
   *
   * @default ''
   */
  class: {
    type: String,
    default: ""
  },
  /**
   * 预设语言名称
   *
   * @default 'zh-CN'
   */
  language: {
    type: String,
    default: "zh-CN"
  },
  /**
   * html变化事件
   */
  onHtmlChanged: {
    type: Function,
    default: void 0
  },
  /**
   * 获取目录结构
   */
  onGetCatalog: {
    type: Function,
    default: void 0
  },
  /**
   * 编辑器唯一标识
   *
   * @default 'md-editor-v3'
   * @deprecated 5.x版本开始使用 id 替换
   */
  editorId: {
    type: String,
    default: void 0
  },
  /**
   * 5.x版本开始 editorId 的替换
   *
   * @default 'md-editor-v3'
   */
  id: {
    type: String,
    default: void 0
  },
  /**
   * 预览中代码是否显示行号
   *
   * @default true
   */
  showCodeRowNumber: {
    type: Boolean,
    default: !0
  },
  /**
   * 预览内容样式
   *
   * @default 'default'
   */
  previewTheme: {
    type: String,
    default: "default"
  },
  /**
   * 编辑器样式
   */
  style: {
    type: Object,
    default: () => ({})
  },
  /**
   * 标题的id生成方式
   *
   * @default (text: string) => text
   */
  mdHeadingId: {
    type: Function,
    default: Uf
  },
  /**
   *
   * 不能保证文本正确的情况，在marked编译md文本后通过该方法处理
   * 推荐DOMPurify、sanitize-html
   *
   * @default (text: string) => text
   */
  sanitize: {
    type: Function,
    default: (e) => e
  },
  /**
   * 不使用该mermaid
   *
   * @default false
   */
  noMermaid: {
    type: Boolean,
    default: !1
  },
  /**
   * 不使用katex
   *
   * @default false
   */
  noKatex: {
    type: Boolean,
    default: !1
  },
  /**
   * 代码主题
   *
   * @default 'atom'
   */
  codeTheme: {
    type: String,
    default: "atom"
  },
  /**
   * 复制代码格式化方法
   *
   * @default (text) => text
   */
  formatCopiedText: {
    type: Function,
    default: (e) => e
  },
  /**
   * 某些预览主题的代码模块背景是暗色系
   * 将这个属性设置为true，会自动在该主题下的light模式下使用暗色系的代码风格
   *
   * @default true
   */
  codeStyleReverse: {
    type: Boolean,
    default: !0
  },
  /**
   * 需要自动调整的预览主题
   *
   * @default ['default', 'mk-cute']
   */
  codeStyleReverseList: {
    type: Array,
    default: ["default", "mk-cute"]
  },
  noHighlight: {
    type: Boolean,
    default: !1
  },
  /**
   * 是否关闭编辑器默认的放大缩小功能
   */
  noImgZoomIn: {
    type: Boolean,
    default: !1
  },
  /**
   * 自定义的图标
   */
  customIcon: {
    type: Object,
    default: {}
  },
  sanitizeMermaid: {
    type: Function,
    default: (e) => Promise.resolve(e)
  },
  /**
   * 是否开启折叠代码功能
   * 不开启会使用div标签替代details标签
   *
   * @default true
   */
  codeFoldable: {
    type: Boolean,
    default: !0
  },
  /**
   * 触发自动折叠代码的行数阈值
   *
   * @default 30
   */
  autoFoldThreshold: {
    type: Number,
    default: 30
  },
  /**
   * 内容重新挂载事件
   *
   * 相比起onHtmlChanged，onRemount会在重新挂载后触发
   */
  onRemount: {
    type: Function,
    default: void 0
  },
  /**
   * 不使用 echarts
   */
  noEcharts: {
    type: Boolean,
    default: !1
  },
  previewComponent: {
    type: [Object, Function],
    default: void 0
  }
};
({
  ...la
});
const ca = [
  "onHtmlChanged",
  "onGetCatalog",
  "onChange",
  "onRemount",
  "update:modelValue"
];
[
  ...ca
];
const qf = (e, t, u) => {
  const { editorId: r } = u, i = {
    rerender() {
      Ge.emit(r, ea);
    }
  };
  t.expose(i);
}, hn = /* @__PURE__ */ Y({
  name: "MdPreview",
  props: la,
  emits: ca,
  setup(e, t) {
    const {
      noKatex: u,
      noMermaid: r,
      noHighlight: i
    } = e, n = V(), o = lf(e);
    sf(e, {
      rootRef: n,
      editorId: o
    }), qf(e, t, {
      editorId: o
    }), Bu(() => {
      Ge.clear(o);
    });
    const a = (l) => {
      var d;
      (d = e.onChange) == null || d.call(e, l), t.emit("onChange", l), t.emit("update:modelValue", l);
    }, s = (l) => {
      var d;
      (d = e.onHtmlChanged) == null || d.call(e, l), t.emit("onHtmlChanged", l);
    }, c = (l) => {
      var d;
      (d = e.onGetCatalog) == null || d.call(e, l), t.emit("onGetCatalog", l);
    }, f = () => {
      var l;
      (l = e.onRemount) == null || l.call(e), t.emit("onRemount");
    };
    return () => h("div", {
      id: o,
      class: [R, e.class, e.theme === "dark" && `${R}-dark`, `${R}-previewOnly`],
      style: e.style,
      ref: n
    }, [h($f, {
      modelValue: e.modelValue,
      onChange: a,
      onHtmlChanged: s,
      onGetCatalog: c,
      mdHeadingId: e.mdHeadingId,
      noMermaid: r,
      sanitize: e.sanitize,
      noKatex: u,
      formatCopiedText: e.formatCopiedText,
      noHighlight: i,
      noImgZoomIn: e.noImgZoomIn,
      previewOnly: !0,
      sanitizeMermaid: e.sanitizeMermaid,
      codeFoldable: e.codeFoldable,
      autoFoldThreshold: e.autoFoldThreshold,
      onRemount: f,
      noEcharts: e.noEcharts,
      previewComponent: e.previewComponent
    }, null)]);
  }
});
hn.install = (e) => (e.component(hn.name, hn), e);
const Gf = {
  onClick: {
    type: Function,
    default: void 0
  },
  /**
   * ==没有意义，仅用于规避克隆组件自动嵌入insert方法时，传入的是该组件而产生的waring
   */
  language: {
    type: String,
    default: void 0
  },
  theme: {
    type: String,
    default: void 0
  },
  disabled: {
    type: Boolean,
    default: void 0
  }
  /**
   * ==结束
   */
}, or = /* @__PURE__ */ Y({
  name: "NormalFooterToolbar",
  props: Gf,
  emits: ["onClick"],
  setup(e, t) {
    return () => {
      const u = I0({
        props: e,
        ctx: t
      });
      return h("div", {
        class: [`${R}-footer-item`, e.disabled && `${R}-disabled`],
        onClick: (r) => {
          var i;
          e.disabled || ((i = e.onClick) == null || i.call(e, r), t.emit("onClick", r));
        }
      }, [u]);
    };
  }
});
or.install = (e) => (e.component(or.name, or), e);
var ar = { exports: {} }, le = {}, sr = { exports: {} }, zt = {}, Yi;
function fa() {
  if (Yi) return zt;
  Yi = 1;
  function e() {
    var n = {};
    return n["align-content"] = !1, n["align-items"] = !1, n["align-self"] = !1, n["alignment-adjust"] = !1, n["alignment-baseline"] = !1, n.all = !1, n["anchor-point"] = !1, n.animation = !1, n["animation-delay"] = !1, n["animation-direction"] = !1, n["animation-duration"] = !1, n["animation-fill-mode"] = !1, n["animation-iteration-count"] = !1, n["animation-name"] = !1, n["animation-play-state"] = !1, n["animation-timing-function"] = !1, n.azimuth = !1, n["backface-visibility"] = !1, n.background = !0, n["background-attachment"] = !0, n["background-clip"] = !0, n["background-color"] = !0, n["background-image"] = !0, n["background-origin"] = !0, n["background-position"] = !0, n["background-repeat"] = !0, n["background-size"] = !0, n["baseline-shift"] = !1, n.binding = !1, n.bleed = !1, n["bookmark-label"] = !1, n["bookmark-level"] = !1, n["bookmark-state"] = !1, n.border = !0, n["border-bottom"] = !0, n["border-bottom-color"] = !0, n["border-bottom-left-radius"] = !0, n["border-bottom-right-radius"] = !0, n["border-bottom-style"] = !0, n["border-bottom-width"] = !0, n["border-collapse"] = !0, n["border-color"] = !0, n["border-image"] = !0, n["border-image-outset"] = !0, n["border-image-repeat"] = !0, n["border-image-slice"] = !0, n["border-image-source"] = !0, n["border-image-width"] = !0, n["border-left"] = !0, n["border-left-color"] = !0, n["border-left-style"] = !0, n["border-left-width"] = !0, n["border-radius"] = !0, n["border-right"] = !0, n["border-right-color"] = !0, n["border-right-style"] = !0, n["border-right-width"] = !0, n["border-spacing"] = !0, n["border-style"] = !0, n["border-top"] = !0, n["border-top-color"] = !0, n["border-top-left-radius"] = !0, n["border-top-right-radius"] = !0, n["border-top-style"] = !0, n["border-top-width"] = !0, n["border-width"] = !0, n.bottom = !1, n["box-decoration-break"] = !0, n["box-shadow"] = !0, n["box-sizing"] = !0, n["box-snap"] = !0, n["box-suppress"] = !0, n["break-after"] = !0, n["break-before"] = !0, n["break-inside"] = !0, n["caption-side"] = !1, n.chains = !1, n.clear = !0, n.clip = !1, n["clip-path"] = !1, n["clip-rule"] = !1, n.color = !0, n["color-interpolation-filters"] = !0, n["column-count"] = !1, n["column-fill"] = !1, n["column-gap"] = !1, n["column-rule"] = !1, n["column-rule-color"] = !1, n["column-rule-style"] = !1, n["column-rule-width"] = !1, n["column-span"] = !1, n["column-width"] = !1, n.columns = !1, n.contain = !1, n.content = !1, n["counter-increment"] = !1, n["counter-reset"] = !1, n["counter-set"] = !1, n.crop = !1, n.cue = !1, n["cue-after"] = !1, n["cue-before"] = !1, n.cursor = !1, n.direction = !1, n.display = !0, n["display-inside"] = !0, n["display-list"] = !0, n["display-outside"] = !0, n["dominant-baseline"] = !1, n.elevation = !1, n["empty-cells"] = !1, n.filter = !1, n.flex = !1, n["flex-basis"] = !1, n["flex-direction"] = !1, n["flex-flow"] = !1, n["flex-grow"] = !1, n["flex-shrink"] = !1, n["flex-wrap"] = !1, n.float = !1, n["float-offset"] = !1, n["flood-color"] = !1, n["flood-opacity"] = !1, n["flow-from"] = !1, n["flow-into"] = !1, n.font = !0, n["font-family"] = !0, n["font-feature-settings"] = !0, n["font-kerning"] = !0, n["font-language-override"] = !0, n["font-size"] = !0, n["font-size-adjust"] = !0, n["font-stretch"] = !0, n["font-style"] = !0, n["font-synthesis"] = !0, n["font-variant"] = !0, n["font-variant-alternates"] = !0, n["font-variant-caps"] = !0, n["font-variant-east-asian"] = !0, n["font-variant-ligatures"] = !0, n["font-variant-numeric"] = !0, n["font-variant-position"] = !0, n["font-weight"] = !0, n.grid = !1, n["grid-area"] = !1, n["grid-auto-columns"] = !1, n["grid-auto-flow"] = !1, n["grid-auto-rows"] = !1, n["grid-column"] = !1, n["grid-column-end"] = !1, n["grid-column-start"] = !1, n["grid-row"] = !1, n["grid-row-end"] = !1, n["grid-row-start"] = !1, n["grid-template"] = !1, n["grid-template-areas"] = !1, n["grid-template-columns"] = !1, n["grid-template-rows"] = !1, n["hanging-punctuation"] = !1, n.height = !0, n.hyphens = !1, n.icon = !1, n["image-orientation"] = !1, n["image-resolution"] = !1, n["ime-mode"] = !1, n["initial-letters"] = !1, n["inline-box-align"] = !1, n["justify-content"] = !1, n["justify-items"] = !1, n["justify-self"] = !1, n.left = !1, n["letter-spacing"] = !0, n["lighting-color"] = !0, n["line-box-contain"] = !1, n["line-break"] = !1, n["line-grid"] = !1, n["line-height"] = !1, n["line-snap"] = !1, n["line-stacking"] = !1, n["line-stacking-ruby"] = !1, n["line-stacking-shift"] = !1, n["line-stacking-strategy"] = !1, n["list-style"] = !0, n["list-style-image"] = !0, n["list-style-position"] = !0, n["list-style-type"] = !0, n.margin = !0, n["margin-bottom"] = !0, n["margin-left"] = !0, n["margin-right"] = !0, n["margin-top"] = !0, n["marker-offset"] = !1, n["marker-side"] = !1, n.marks = !1, n.mask = !1, n["mask-box"] = !1, n["mask-box-outset"] = !1, n["mask-box-repeat"] = !1, n["mask-box-slice"] = !1, n["mask-box-source"] = !1, n["mask-box-width"] = !1, n["mask-clip"] = !1, n["mask-image"] = !1, n["mask-origin"] = !1, n["mask-position"] = !1, n["mask-repeat"] = !1, n["mask-size"] = !1, n["mask-source-type"] = !1, n["mask-type"] = !1, n["max-height"] = !0, n["max-lines"] = !1, n["max-width"] = !0, n["min-height"] = !0, n["min-width"] = !0, n["move-to"] = !1, n["nav-down"] = !1, n["nav-index"] = !1, n["nav-left"] = !1, n["nav-right"] = !1, n["nav-up"] = !1, n["object-fit"] = !1, n["object-position"] = !1, n.opacity = !1, n.order = !1, n.orphans = !1, n.outline = !1, n["outline-color"] = !1, n["outline-offset"] = !1, n["outline-style"] = !1, n["outline-width"] = !1, n.overflow = !1, n["overflow-wrap"] = !1, n["overflow-x"] = !1, n["overflow-y"] = !1, n.padding = !0, n["padding-bottom"] = !0, n["padding-left"] = !0, n["padding-right"] = !0, n["padding-top"] = !0, n.page = !1, n["page-break-after"] = !1, n["page-break-before"] = !1, n["page-break-inside"] = !1, n["page-policy"] = !1, n.pause = !1, n["pause-after"] = !1, n["pause-before"] = !1, n.perspective = !1, n["perspective-origin"] = !1, n.pitch = !1, n["pitch-range"] = !1, n["play-during"] = !1, n.position = !1, n["presentation-level"] = !1, n.quotes = !1, n["region-fragment"] = !1, n.resize = !1, n.rest = !1, n["rest-after"] = !1, n["rest-before"] = !1, n.richness = !1, n.right = !1, n.rotation = !1, n["rotation-point"] = !1, n["ruby-align"] = !1, n["ruby-merge"] = !1, n["ruby-position"] = !1, n["shape-image-threshold"] = !1, n["shape-outside"] = !1, n["shape-margin"] = !1, n.size = !1, n.speak = !1, n["speak-as"] = !1, n["speak-header"] = !1, n["speak-numeral"] = !1, n["speak-punctuation"] = !1, n["speech-rate"] = !1, n.stress = !1, n["string-set"] = !1, n["tab-size"] = !1, n["table-layout"] = !1, n["text-align"] = !0, n["text-align-last"] = !0, n["text-combine-upright"] = !0, n["text-decoration"] = !0, n["text-decoration-color"] = !0, n["text-decoration-line"] = !0, n["text-decoration-skip"] = !0, n["text-decoration-style"] = !0, n["text-emphasis"] = !0, n["text-emphasis-color"] = !0, n["text-emphasis-position"] = !0, n["text-emphasis-style"] = !0, n["text-height"] = !0, n["text-indent"] = !0, n["text-justify"] = !0, n["text-orientation"] = !0, n["text-overflow"] = !0, n["text-shadow"] = !0, n["text-space-collapse"] = !0, n["text-transform"] = !0, n["text-underline-position"] = !0, n["text-wrap"] = !0, n.top = !1, n.transform = !1, n["transform-origin"] = !1, n["transform-style"] = !1, n.transition = !1, n["transition-delay"] = !1, n["transition-duration"] = !1, n["transition-property"] = !1, n["transition-timing-function"] = !1, n["unicode-bidi"] = !1, n["vertical-align"] = !1, n.visibility = !1, n["voice-balance"] = !1, n["voice-duration"] = !1, n["voice-family"] = !1, n["voice-pitch"] = !1, n["voice-range"] = !1, n["voice-rate"] = !1, n["voice-stress"] = !1, n["voice-volume"] = !1, n.volume = !1, n["white-space"] = !1, n.widows = !1, n.width = !0, n["will-change"] = !1, n["word-break"] = !0, n["word-spacing"] = !0, n["word-wrap"] = !0, n["wrap-flow"] = !1, n["wrap-through"] = !1, n["writing-mode"] = !1, n["z-index"] = !1, n;
  }
  function t(n, o, a) {
  }
  function u(n, o, a) {
  }
  var r = /javascript\s*\:/img;
  function i(n, o) {
    return r.test(o) ? "" : o;
  }
  return zt.whiteList = e(), zt.getDefaultWhiteList = e, zt.onAttr = t, zt.onIgnoreAttr = u, zt.safeAttrValue = i, zt;
}
var Qi, Ki;
function da() {
  return Ki || (Ki = 1, Qi = {
    indexOf: function(e, t) {
      var u, r;
      if (Array.prototype.indexOf)
        return e.indexOf(t);
      for (u = 0, r = e.length; u < r; u++)
        if (e[u] === t)
          return u;
      return -1;
    },
    forEach: function(e, t, u) {
      var r, i;
      if (Array.prototype.forEach)
        return e.forEach(t, u);
      for (r = 0, i = e.length; r < i; r++)
        t.call(u, e[r], r, e);
    },
    trim: function(e) {
      return String.prototype.trim ? e.trim() : e.replace(/(^\s*)|(\s*$)/g, "");
    },
    trimRight: function(e) {
      return String.prototype.trimRight ? e.trimRight() : e.replace(/(\s*$)/g, "");
    }
  }), Qi;
}
var lr, Ji;
function Wf() {
  if (Ji) return lr;
  Ji = 1;
  var e = da();
  function t(u, r) {
    u = e.trimRight(u), u[u.length - 1] !== ";" && (u += ";");
    var i = u.length, n = !1, o = 0, a = 0, s = "";
    function c() {
      if (!n) {
        var d = e.trim(u.slice(o, a)), g = d.indexOf(":");
        if (g !== -1) {
          var p = e.trim(d.slice(0, g)), C = e.trim(d.slice(g + 1));
          if (p) {
            var k = r(o, s.length, p, C, d);
            k && (s += k + "; ");
          }
        }
      }
      o = a + 1;
    }
    for (; a < i; a++) {
      var f = u[a];
      if (f === "/" && u[a + 1] === "*") {
        var l = u.indexOf("*/", a + 2);
        if (l === -1) break;
        a = l + 1, o = a + 1, n = !1;
      } else f === "(" ? n = !0 : f === ")" ? n = !1 : f === ";" ? n || c() : f === `
` && c();
    }
    return e.trim(s);
  }
  return lr = t, lr;
}
var cr, eo;
function Zf() {
  if (eo) return cr;
  eo = 1;
  var e = fa(), t = Wf();
  da();
  function u(n) {
    return n == null;
  }
  function r(n) {
    var o = {};
    for (var a in n)
      o[a] = n[a];
    return o;
  }
  function i(n) {
    n = r(n || {}), n.whiteList = n.whiteList || e.whiteList, n.onAttr = n.onAttr || e.onAttr, n.onIgnoreAttr = n.onIgnoreAttr || e.onIgnoreAttr, n.safeAttrValue = n.safeAttrValue || e.safeAttrValue, this.options = n;
  }
  return i.prototype.process = function(n) {
    if (n = n || "", n = n.toString(), !n) return "";
    var o = this, a = o.options, s = a.whiteList, c = a.onAttr, f = a.onIgnoreAttr, l = a.safeAttrValue, d = t(n, function(g, p, C, k, w) {
      var v = s[C], b = !1;
      if (v === !0 ? b = v : typeof v == "function" ? b = v(k) : v instanceof RegExp && (b = v.test(k)), b !== !0 && (b = !1), k = l(C, k), !!k) {
        var A = {
          position: p,
          sourcePosition: g,
          source: w,
          isWhite: b
        };
        if (b) {
          var y = c(C, k, A);
          return u(y) ? C + ":" + k : y;
        } else {
          var y = f(C, k, A);
          if (!u(y))
            return y;
        }
      }
    });
    return d;
  }, cr = i, cr;
}
var to;
function Lr() {
  return to || (to = 1, function(e, t) {
    var u = fa(), r = Zf();
    function i(o, a) {
      var s = new r(a);
      return s.process(o);
    }
    t = e.exports = i, t.FilterCSS = r;
    for (var n in u) t[n] = u[n];
    typeof window < "u" && (window.filterCSS = e.exports);
  }(sr, sr.exports)), sr.exports;
}
var uo, no;
function Vr() {
  return no || (no = 1, uo = {
    indexOf: function(e, t) {
      var u, r;
      if (Array.prototype.indexOf)
        return e.indexOf(t);
      for (u = 0, r = e.length; u < r; u++)
        if (e[u] === t)
          return u;
      return -1;
    },
    forEach: function(e, t, u) {
      var r, i;
      if (Array.prototype.forEach)
        return e.forEach(t, u);
      for (r = 0, i = e.length; r < i; r++)
        t.call(u, e[r], r, e);
    },
    trim: function(e) {
      return String.prototype.trim ? e.trim() : e.replace(/(^\s*)|(\s*$)/g, "");
    },
    spaceIndex: function(e) {
      var t = /\s|\n|\t/, u = t.exec(e);
      return u ? u.index : -1;
    }
  }), uo;
}
var ro;
function ha() {
  if (ro) return le;
  ro = 1;
  var e = Lr().FilterCSS, t = Lr().getDefaultWhiteList, u = Vr();
  function r() {
    return {
      a: ["target", "href", "title"],
      abbr: ["title"],
      address: [],
      area: ["shape", "coords", "href", "alt"],
      article: [],
      aside: [],
      audio: [
        "autoplay",
        "controls",
        "crossorigin",
        "loop",
        "muted",
        "preload",
        "src"
      ],
      b: [],
      bdi: ["dir"],
      bdo: ["dir"],
      big: [],
      blockquote: ["cite"],
      br: [],
      caption: [],
      center: [],
      cite: [],
      code: [],
      col: ["align", "valign", "span", "width"],
      colgroup: ["align", "valign", "span", "width"],
      dd: [],
      del: ["datetime"],
      details: ["open"],
      div: [],
      dl: [],
      dt: [],
      em: [],
      figcaption: [],
      figure: [],
      font: ["color", "size", "face"],
      footer: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      header: [],
      hr: [],
      i: [],
      img: ["src", "alt", "title", "width", "height", "loading"],
      ins: ["datetime"],
      kbd: [],
      li: [],
      mark: [],
      nav: [],
      ol: [],
      p: [],
      pre: [],
      s: [],
      section: [],
      small: [],
      span: [],
      sub: [],
      summary: [],
      sup: [],
      strong: [],
      strike: [],
      table: ["width", "border", "align", "valign"],
      tbody: ["align", "valign"],
      td: ["width", "rowspan", "colspan", "align", "valign"],
      tfoot: ["align", "valign"],
      th: ["width", "rowspan", "colspan", "align", "valign"],
      thead: ["align", "valign"],
      tr: ["rowspan", "align", "valign"],
      tt: [],
      u: [],
      ul: [],
      video: [
        "autoplay",
        "controls",
        "crossorigin",
        "loop",
        "muted",
        "playsinline",
        "poster",
        "preload",
        "src",
        "height",
        "width"
      ]
    };
  }
  var i = new e();
  function n(T, $, S) {
  }
  function o(T, $, S) {
  }
  function a(T, $, S) {
  }
  function s(T, $, S) {
  }
  function c(T) {
    return T.replace(l, "&lt;").replace(d, "&gt;");
  }
  function f(T, $, S, W) {
    if (S = G(S), $ === "href" || $ === "src") {
      if (S = u.trim(S), S === "#") return "#";
      if (!(S.substr(0, 7) === "http://" || S.substr(0, 8) === "https://" || S.substr(0, 7) === "mailto:" || S.substr(0, 4) === "tel:" || S.substr(0, 11) === "data:image/" || S.substr(0, 6) === "ftp://" || S.substr(0, 2) === "./" || S.substr(0, 3) === "../" || S[0] === "#" || S[0] === "/"))
        return "";
    } else if ($ === "background") {
      if (v.lastIndex = 0, v.test(S))
        return "";
    } else if ($ === "style") {
      if (b.lastIndex = 0, b.test(S) || (A.lastIndex = 0, A.test(S) && (v.lastIndex = 0, v.test(S))))
        return "";
      W !== !1 && (W = W || i, S = W.process(S));
    }
    return S = P(S), S;
  }
  var l = /</g, d = />/g, g = /"/g, p = /&quot;/g, C = /&#([a-zA-Z0-9]*);?/gim, k = /&colon;?/gim, w = /&newline;?/gim, v = /((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a):/gi, b = /e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/gi, A = /u\s*r\s*l\s*\(.*/gi;
  function y(T) {
    return T.replace(g, "&quot;");
  }
  function E(T) {
    return T.replace(p, '"');
  }
  function D(T) {
    return T.replace(C, function($, S) {
      return S[0] === "x" || S[0] === "X" ? String.fromCharCode(parseInt(S.substr(1), 16)) : String.fromCharCode(parseInt(S, 10));
    });
  }
  function _(T) {
    return T.replace(k, ":").replace(w, " ");
  }
  function H(T) {
    for (var $ = "", S = 0, W = T.length; S < W; S++)
      $ += T.charCodeAt(S) < 32 ? " " : T.charAt(S);
    return u.trim($);
  }
  function G(T) {
    return T = E(T), T = D(T), T = _(T), T = H(T), T;
  }
  function P(T) {
    return T = y(T), T = c(T), T;
  }
  function F() {
    return "";
  }
  function L(T, $) {
    typeof $ != "function" && ($ = function() {
    });
    var S = !Array.isArray(T);
    function W(fe) {
      return S ? !0 : u.indexOf(T, fe) !== -1;
    }
    var J = [], Q = !1;
    return {
      onIgnoreTag: function(fe, ue, Ie) {
        if (W(fe))
          if (Ie.isClosing) {
            var ee = "[/removed]", gt = Ie.position + ee.length;
            return J.push([
              Q !== !1 ? Q : Ie.position,
              gt
            ]), Q = !1, ee;
          } else
            return Q || (Q = Ie.position), "[removed]";
        else
          return $(fe, ue, Ie);
      },
      remove: function(fe) {
        var ue = "", Ie = 0;
        return u.forEach(J, function(ee) {
          ue += fe.slice(Ie, ee[0]), Ie = ee[1];
        }), ue += fe.slice(Ie), ue;
      }
    };
  }
  function B(T) {
    for (var $ = "", S = 0; S < T.length; ) {
      var W = T.indexOf("<!--", S);
      if (W === -1) {
        $ += T.slice(S);
        break;
      }
      $ += T.slice(S, W);
      var J = T.indexOf("-->", W);
      if (J === -1)
        break;
      S = J + 3;
    }
    return $;
  }
  function M(T) {
    var $ = T.split("");
    return $ = $.filter(function(S) {
      var W = S.charCodeAt(0);
      return W === 127 ? !1 : W <= 31 ? W === 10 || W === 13 : !0;
    }), $.join("");
  }
  return le.whiteList = r(), le.getDefaultWhiteList = r, le.onTag = n, le.onIgnoreTag = o, le.onTagAttr = a, le.onIgnoreTagAttr = s, le.safeAttrValue = f, le.escapeHtml = c, le.escapeQuote = y, le.unescapeQuote = E, le.escapeHtmlEntities = D, le.escapeDangerHtml5Entities = _, le.clearNonPrintableCharacter = H, le.friendlyAttrValue = G, le.escapeAttrValue = P, le.onIgnoreTagStripAll = F, le.StripTagBody = L, le.stripCommentTag = B, le.stripBlankChar = M, le.attributeWrapSign = '"', le.cssFilter = i, le.getDefaultCSSWhiteList = t, le;
}
var en = {}, io;
function pa() {
  if (io) return en;
  io = 1;
  var e = Vr();
  function t(l) {
    var d = e.spaceIndex(l), g;
    return d === -1 ? g = l.slice(1, -1) : g = l.slice(1, d + 1), g = e.trim(g).toLowerCase(), g.slice(0, 1) === "/" && (g = g.slice(1)), g.slice(-1) === "/" && (g = g.slice(0, -1)), g;
  }
  function u(l) {
    return l.slice(0, 2) === "</";
  }
  function r(l, d, g) {
    var p = "", C = 0, k = !1, w = !1, v = 0, b = l.length, A = "", y = "";
    e: for (v = 0; v < b; v++) {
      var E = l.charAt(v);
      if (k === !1) {
        if (E === "<") {
          k = v;
          continue;
        }
      } else if (w === !1) {
        if (E === "<") {
          p += g(l.slice(C, v)), k = v, C = v;
          continue;
        }
        if (E === ">" || v === b - 1) {
          p += g(l.slice(C, k)), y = l.slice(k, v + 1), A = t(y), p += d(
            k,
            p.length,
            A,
            y,
            u(y)
          ), C = v + 1, k = !1;
          continue;
        }
        if (E === '"' || E === "'")
          for (var D = 1, _ = l.charAt(v - D); _.trim() === "" || _ === "="; ) {
            if (_ === "=") {
              w = E;
              continue e;
            }
            _ = l.charAt(v - ++D);
          }
      } else if (E === w) {
        w = !1;
        continue;
      }
    }
    return C < b && (p += g(l.substr(C))), p;
  }
  var i = /[^a-zA-Z0-9\\_:.-]/gim;
  function n(l, d) {
    var g = 0, p = 0, C = [], k = !1, w = l.length;
    function v(D, _) {
      if (D = e.trim(D), D = D.replace(i, "").toLowerCase(), !(D.length < 1)) {
        var H = d(D, _ || "");
        H && C.push(H);
      }
    }
    for (var b = 0; b < w; b++) {
      var A = l.charAt(b), y, E;
      if (k === !1 && A === "=") {
        k = l.slice(g, b), g = b + 1, p = l.charAt(g) === '"' || l.charAt(g) === "'" ? g : a(l, b + 1);
        continue;
      }
      if (k !== !1 && b === p) {
        if (E = l.indexOf(A, b + 1), E === -1)
          break;
        y = e.trim(l.slice(p + 1, E)), v(k, y), k = !1, b = E, g = b + 1;
        continue;
      }
      if (/\s|\n|\t/.test(A))
        if (l = l.replace(/\s|\n|\t/g, " "), k === !1)
          if (E = o(l, b), E === -1) {
            y = e.trim(l.slice(g, b)), v(y), k = !1, g = b + 1;
            continue;
          } else {
            b = E - 1;
            continue;
          }
        else if (E = s(l, b - 1), E === -1) {
          y = e.trim(l.slice(g, b)), y = f(y), v(k, y), k = !1, g = b + 1;
          continue;
        } else
          continue;
    }
    return g < l.length && (k === !1 ? v(l.slice(g)) : v(k, f(e.trim(l.slice(g))))), e.trim(C.join(" "));
  }
  function o(l, d) {
    for (; d < l.length; d++) {
      var g = l[d];
      if (g !== " ")
        return g === "=" ? d : -1;
    }
  }
  function a(l, d) {
    for (; d < l.length; d++) {
      var g = l[d];
      if (g !== " ")
        return g === "'" || g === '"' ? d : -1;
    }
  }
  function s(l, d) {
    for (; d > 0; d--) {
      var g = l[d];
      if (g !== " ")
        return g === "=" ? d : -1;
    }
  }
  function c(l) {
    return l[0] === '"' && l[l.length - 1] === '"' || l[0] === "'" && l[l.length - 1] === "'";
  }
  function f(l) {
    return c(l) ? l.substr(1, l.length - 2) : l;
  }
  return en.parseTag = r, en.parseAttr = n, en;
}
var fr, oo;
function Vf() {
  if (oo) return fr;
  oo = 1;
  var e = Lr().FilterCSS, t = ha(), u = pa(), r = u.parseTag, i = u.parseAttr, n = Vr();
  function o(l) {
    return l == null;
  }
  function a(l) {
    var d = n.spaceIndex(l);
    if (d === -1)
      return {
        html: "",
        closing: l[l.length - 2] === "/"
      };
    l = n.trim(l.slice(d + 1, -1));
    var g = l[l.length - 1] === "/";
    return g && (l = n.trim(l.slice(0, -1))), {
      html: l,
      closing: g
    };
  }
  function s(l) {
    var d = {};
    for (var g in l)
      d[g] = l[g];
    return d;
  }
  function c(l) {
    var d = {};
    for (var g in l)
      Array.isArray(l[g]) ? d[g.toLowerCase()] = l[g].map(function(p) {
        return p.toLowerCase();
      }) : d[g.toLowerCase()] = l[g];
    return d;
  }
  function f(l) {
    l = s(l || {}), l.stripIgnoreTag && (l.onIgnoreTag && console.error(
      'Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time'
    ), l.onIgnoreTag = t.onIgnoreTagStripAll), l.whiteList || l.allowList ? l.whiteList = c(l.whiteList || l.allowList) : l.whiteList = t.whiteList, this.attributeWrapSign = l.singleQuotedAttributeValue === !0 ? "'" : t.attributeWrapSign, l.onTag = l.onTag || t.onTag, l.onTagAttr = l.onTagAttr || t.onTagAttr, l.onIgnoreTag = l.onIgnoreTag || t.onIgnoreTag, l.onIgnoreTagAttr = l.onIgnoreTagAttr || t.onIgnoreTagAttr, l.safeAttrValue = l.safeAttrValue || t.safeAttrValue, l.escapeHtml = l.escapeHtml || t.escapeHtml, this.options = l, l.css === !1 ? this.cssFilter = !1 : (l.css = l.css || {}, this.cssFilter = new e(l.css));
  }
  return f.prototype.process = function(l) {
    if (l = l || "", l = l.toString(), !l) return "";
    var d = this, g = d.options, p = g.whiteList, C = g.onTag, k = g.onIgnoreTag, w = g.onTagAttr, v = g.onIgnoreTagAttr, b = g.safeAttrValue, A = g.escapeHtml, y = d.attributeWrapSign, E = d.cssFilter;
    g.stripBlankChar && (l = t.stripBlankChar(l)), g.allowCommentTag || (l = t.stripCommentTag(l));
    var D = !1;
    g.stripIgnoreTagBody && (D = t.StripTagBody(
      g.stripIgnoreTagBody,
      k
    ), k = D.onIgnoreTag);
    var _ = r(
      l,
      function(H, G, P, F, L) {
        var B = {
          sourcePosition: H,
          position: G,
          isClosing: L,
          isWhite: Object.prototype.hasOwnProperty.call(p, P)
        }, M = C(P, F, B);
        if (!o(M)) return M;
        if (B.isWhite) {
          if (B.isClosing)
            return "</" + P + ">";
          var T = a(F), $ = p[P], S = i(T.html, function(W, J) {
            var Q = n.indexOf($, W) !== -1, fe = w(P, W, J, Q);
            return o(fe) ? Q ? (J = b(P, W, J, E), J ? W + "=" + y + J + y : W) : (fe = v(P, W, J, Q), o(fe) ? void 0 : fe) : fe;
          });
          return F = "<" + P, S && (F += " " + S), T.closing && (F += " /"), F += ">", F;
        } else
          return M = k(P, F, B), o(M) ? A(F) : M;
      },
      A
    );
    return D && (_ = D.remove(_)), _;
  }, fr = f, fr;
}
var ao;
function Xf() {
  return ao || (ao = 1, function(e, t) {
    var u = ha(), r = pa(), i = Vf();
    function n(a, s) {
      var c = new i(s);
      return c.process(a);
    }
    t = e.exports = n, t.filterXSS = n, t.FilterXSS = i, function() {
      for (var a in u)
        t[a] = u[a];
      for (var s in r)
        t[s] = r[s];
    }(), typeof window < "u" && (window.filterXSS = e.exports);
    function o() {
      return typeof self < "u" && typeof DedicatedWorkerGlobalScope < "u" && self instanceof DedicatedWorkerGlobalScope;
    }
    o() && (self.filterXSS = e.exports);
  }(ar, ar.exports)), ar.exports;
}
Xf();
const wu = /* @__PURE__ */ Y({
  name: "FMarkdownPreview",
  props: y0,
  setup(e) {
    const t = e.content;
    return () => h("div", {
      class: "f-markdown-preview-container"
    }, [h(hn, {
      modelValue: t
    }, null)]);
  }
});
wu.install = (e) => {
  e.component(wu.name, wu);
};
const Yf = "/platform/common/web/renderer/index.html#/preview", Qf = "Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components/Contacts.frm", Kf = "Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components", Jf = "67441dbb-0219-46f2-b247-51555c317995";
function ed(e) {
  if (e.url) return e.url;
  const t = e.baseUri ?? Yf, u = e.metadataPath ?? Qf, r = e.projectPath ?? Kf, i = e.baseMetadataId ?? Jf;
  return `${t}?metadataPath=${encodeURIComponent(u)}&projectPath=${encodeURIComponent(r)}&baseMetadataId=${encodeURIComponent(i)}`;
}
const pn = /* @__PURE__ */ Y({
  name: "ChatPreview",
  props: x0,
  setup(e) {
    const t = N(() => ed(e.previewConfig ?? {})), u = N(() => {
      var i;
      return !!((i = e.previewConfig) != null && i.content) && e.previewConfig.contentType === "markdown";
    }), r = () => h("div", {
      class: "f-chat-preview-header"
    }, [h("div", {
      class: "f-chat-preview-header-left"
    }, [h("button", {
      class: "f-chat-preview-preview-btn"
    }, [h("i", {
      class: "f-icon f-icon-view-cardview"
    }, null), h("span", {
      class: "f-chat-preview-preview-text"
    }, [Ae("预览")])])]), h("div", {
      class: "f-chat-preview-header-right"
    }, [h("button", {
      class: "f-chat-preview-tool-btn",
      title: "关闭预览",
      "aria-label": "关闭预览",
      onClick: () => {
        var i;
        return (i = e.onClose) == null ? void 0 : i.call(e);
      }
    }, [h("i", {
      class: "f-icon f-icon-close"
    }, null)])])]);
    return () => h("div", {
      class: "f-chat-preview"
    }, [r(), h("div", {
      class: "f-chat-preview-content"
    }, [u.value ? h(wu, {
      content: e.previewConfig.content
    }, null) : h("iframe", {
      name: "preview-iframe",
      title: "preview-iframe",
      src: t.value
    }, null)])]);
  }
});
pn.install = (e) => {
  e.component(pn.name, pn);
};
function so(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var u = 0, r = Array(t); u < t; u++) r[u] = e[u];
  return r;
}
function td(e) {
  if (Array.isArray(e)) return e;
}
function ud(e, t, u) {
  return (t = ld(t)) in e ? Object.defineProperty(e, t, {
    value: u,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = u, e;
}
function nd(e, t) {
  var u = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (u != null) {
    var r, i, n, o, a = [], s = !0, c = !1;
    try {
      if (n = (u = u.call(e)).next, t !== 0) for (; !(s = (r = n.call(u)).done) && (a.push(r.value), a.length !== t); s = !0) ;
    } catch (f) {
      c = !0, i = f;
    } finally {
      try {
        if (!s && u.return != null && (o = u.return(), Object(o) !== o)) return;
      } finally {
        if (c) throw i;
      }
    }
    return a;
  }
}
function rd() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function lo(e, t) {
  var u = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), u.push.apply(u, r);
  }
  return u;
}
function co(e) {
  for (var t = 1; t < arguments.length; t++) {
    var u = arguments[t] != null ? arguments[t] : {};
    t % 2 ? lo(Object(u), !0).forEach(function(r) {
      ud(e, r, u[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(u)) : lo(Object(u)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(u, r));
    });
  }
  return e;
}
function id(e, t) {
  if (e == null) return {};
  var u, r, i = od(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) u = n[r], t.indexOf(u) === -1 && {}.propertyIsEnumerable.call(e, u) && (i[u] = e[u]);
  }
  return i;
}
function od(e, t) {
  if (e == null) return {};
  var u = {};
  for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
    if (t.indexOf(r) !== -1) continue;
    u[r] = e[r];
  }
  return u;
}
function ad(e, t) {
  return td(e) || nd(e, t) || cd(e, t) || rd();
}
function sd(e, t) {
  if (typeof e != "object" || !e) return e;
  var u = e[Symbol.toPrimitive];
  if (u !== void 0) {
    var r = u.call(e, t);
    if (typeof r != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function ld(e) {
  var t = sd(e, "string");
  return typeof t == "symbol" ? t : t + "";
}
function cd(e, t) {
  if (e) {
    if (typeof e == "string") return so(e, t);
    var u = {}.toString.call(e).slice(8, -1);
    return u === "Object" && e.constructor && (u = e.constructor.name), u === "Map" || u === "Set" ? Array.from(e) : u === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(u) ? so(e, t) : void 0;
  }
}
function fd(e, t, u) {
  return t in e ? Object.defineProperty(e, t, {
    value: u,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = u, e;
}
function fo(e, t) {
  var u = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), u.push.apply(u, r);
  }
  return u;
}
function ho(e) {
  for (var t = 1; t < arguments.length; t++) {
    var u = arguments[t] != null ? arguments[t] : {};
    t % 2 ? fo(Object(u), !0).forEach(function(r) {
      fd(e, r, u[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(u)) : fo(Object(u)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(u, r));
    });
  }
  return e;
}
function dd() {
  for (var e = arguments.length, t = new Array(e), u = 0; u < e; u++)
    t[u] = arguments[u];
  return function(r) {
    return t.reduceRight(function(i, n) {
      return n(i);
    }, r);
  };
}
function ku(e) {
  return function t() {
    for (var u = this, r = arguments.length, i = new Array(r), n = 0; n < r; n++)
      i[n] = arguments[n];
    return i.length >= e.length ? e.apply(this, i) : function() {
      for (var o = arguments.length, a = new Array(o), s = 0; s < o; s++)
        a[s] = arguments[s];
      return t.apply(u, [].concat(i, a));
    };
  };
}
function Sn(e) {
  return {}.toString.call(e).includes("Object");
}
function hd(e) {
  return !Object.keys(e).length;
}
function Iu(e) {
  return typeof e == "function";
}
function pd(e, t) {
  return Object.prototype.hasOwnProperty.call(e, t);
}
function md(e, t) {
  return Sn(t) || It("changeType"), Object.keys(t).some(function(u) {
    return !pd(e, u);
  }) && It("changeField"), t;
}
function gd(e) {
  Iu(e) || It("selectorType");
}
function bd(e) {
  Iu(e) || Sn(e) || It("handlerType"), Sn(e) && Object.values(e).some(function(t) {
    return !Iu(t);
  }) && It("handlersType");
}
function vd(e) {
  e || It("initialIsRequired"), Sn(e) || It("initialType"), hd(e) && It("initialContent");
}
function xd(e, t) {
  throw new Error(e[t] || e.default);
}
var yd = {
  initialIsRequired: "initial state is required",
  initialType: "initial state should be an object",
  initialContent: "initial state shouldn't be an empty object",
  handlerType: "handler should be an object or a function",
  handlersType: "all handlers should be a functions",
  selectorType: "selector should be a function",
  changeType: "provided value of changes should be an object",
  changeField: 'it seams you want to change a field in the state which is not specified in the "initial" state',
  default: "an unknown error accured in `state-local` package"
}, It = ku(xd)(yd), tn = {
  changes: md,
  selector: gd,
  handler: bd,
  initial: vd
};
function Ad(e) {
  var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  tn.initial(e), tn.handler(t);
  var u = {
    current: e
  }, r = ku(_d)(u, t), i = ku(Cd)(u), n = ku(tn.changes)(e), o = ku(kd)(u);
  function a() {
    var c = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : function(f) {
      return f;
    };
    return tn.selector(c), c(u.current);
  }
  function s(c) {
    dd(r, i, n, o)(c);
  }
  return [a, s];
}
function kd(e, t) {
  return Iu(t) ? t(e.current) : t;
}
function Cd(e, t) {
  return e.current = ho(ho({}, e.current), t), t;
}
function _d(e, t, u) {
  return Iu(t) ? t(e.current) : Object.keys(u).forEach(function(r) {
    var i;
    return (i = t[r]) === null || i === void 0 ? void 0 : i.call(t, e.current[r]);
  }), u;
}
var wd = {
  create: Ad
}, Ed = {
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs"
  }
};
function Fd(e) {
  return function t() {
    for (var u = this, r = arguments.length, i = new Array(r), n = 0; n < r; n++)
      i[n] = arguments[n];
    return i.length >= e.length ? e.apply(this, i) : function() {
      for (var o = arguments.length, a = new Array(o), s = 0; s < o; s++)
        a[s] = arguments[s];
      return t.apply(u, [].concat(i, a));
    };
  };
}
function Dd(e) {
  return {}.toString.call(e).includes("Object");
}
function Td(e) {
  return e || po("configIsRequired"), Dd(e) || po("configType"), e.urls ? (Sd(), {
    paths: {
      vs: e.urls.monacoBase
    }
  }) : e;
}
function Sd() {
  console.warn(ma.deprecation);
}
function Ld(e, t) {
  throw new Error(e[t] || e.default);
}
var ma = {
  configIsRequired: "the configuration object is required",
  configType: "the configuration object should be an object",
  default: "an unknown error accured in `@monaco-editor/loader` package",
  deprecation: `Deprecation warning!
    You are using deprecated way of configuration.

    Instead of using
      monaco.config({ urls: { monacoBase: '...' } })
    use
      monaco.config({ paths: { vs: '...' } })

    For more please check the link https://github.com/suren-atoyan/monaco-loader#config
  `
}, po = Fd(Ld)(ma), Id = {
  config: Td
}, Od = function() {
  for (var t = arguments.length, u = new Array(t), r = 0; r < t; r++)
    u[r] = arguments[r];
  return function(i) {
    return u.reduceRight(function(n, o) {
      return o(n);
    }, i);
  };
};
function ga(e, t) {
  return Object.keys(t).forEach(function(u) {
    t[u] instanceof Object && e[u] && Object.assign(t[u], ga(e[u], t[u]));
  }), co(co({}, e), t);
}
var Md = {
  type: "cancelation",
  msg: "operation is manually canceled"
};
function dr(e) {
  var t = !1, u = new Promise(function(r, i) {
    e.then(function(n) {
      return t ? i(Md) : r(n);
    }), e.catch(i);
  });
  return u.cancel = function() {
    return t = !0;
  }, u;
}
var Rd = ["monaco"], Bd = wd.create({
  config: Ed,
  isInitialized: !1,
  resolve: null,
  reject: null,
  monaco: null
}), ba = ad(Bd, 2), ju = ba[0], Bn = ba[1];
function zd(e) {
  var t = Id.config(e), u = t.monaco, r = id(t, Rd);
  Bn(function(i) {
    return {
      config: ga(i.config, r),
      monaco: u
    };
  });
}
function Nd() {
  var e = ju(function(t) {
    var u = t.monaco, r = t.isInitialized, i = t.resolve;
    return {
      monaco: u,
      isInitialized: r,
      resolve: i
    };
  });
  if (!e.isInitialized) {
    if (Bn({
      isInitialized: !0
    }), e.monaco)
      return e.resolve(e.monaco), dr(hr);
    if (window.monaco && window.monaco.editor)
      return va(window.monaco), e.resolve(window.monaco), dr(hr);
    Od(Pd, Hd)($d);
  }
  return dr(hr);
}
function Pd(e) {
  return document.body.appendChild(e);
}
function jd(e) {
  var t = document.createElement("script");
  return e && (t.src = e), t;
}
function Hd(e) {
  var t = ju(function(r) {
    var i = r.config, n = r.reject;
    return {
      config: i,
      reject: n
    };
  }), u = jd("".concat(t.config.paths.vs, "/loader.js"));
  return u.onload = function() {
    return e();
  }, u.onerror = t.reject, u;
}
function $d() {
  var e = ju(function(u) {
    var r = u.config, i = u.resolve, n = u.reject;
    return {
      config: r,
      resolve: i,
      reject: n
    };
  }), t = window.require;
  t.config(e.config), t(["vs/editor/editor.main"], function(u) {
    var r = u.m || u;
    va(r), e.resolve(r);
  }, function(u) {
    e.reject(u);
  });
}
function va(e) {
  ju().monaco || Bn({
    monaco: e
  });
}
function Ud() {
  return ju(function(e) {
    var t = e.monaco;
    return t;
  });
}
var hr = new Promise(function(e, t) {
  return Bn({
    resolve: e,
    reject: t
  });
}), qd = {
  config: zd,
  init: Nd,
  __getMonacoInstance: Ud
};
const Gd = {
  content: {
    type: Object,
    required: !0
  }
}, mo = 20, Wd = 16, Kt = 180;
function Zd(e) {
  typeof requestIdleCallback < "u" ? requestIdleCallback(e, {
    timeout: 500
  }) : setTimeout(e, 0);
}
const mn = /* @__PURE__ */ Y({
  name: "FXCodingMessage",
  props: Gd,
  setup(e) {
    const t = V(!0), u = V(!1), r = V(null), i = V(null), n = V(Kt), o = V(!1);
    function a() {
      t.value = !t.value;
    }
    function s() {
      var v, b, A, y;
      const p = (v = e.content) == null ? void 0 : v.code;
      if (!p) return Kt;
      const k = i.value;
      let w;
      if (k != null && k.getOriginalEditor && (k != null && k.getModifiedEditor)) {
        const E = ((b = k.getOriginalEditor().getModel()) == null ? void 0 : b.getLineCount()) ?? 0, D = ((A = k.getModifiedEditor().getModel()) == null ? void 0 : A.getLineCount()) ?? 0;
        w = E + D;
      } else if (k != null && k.getModel)
        w = ((y = k.getModel()) == null ? void 0 : y.getLineCount()) ?? 0;
      else {
        const {
          value: E,
          originalValue: D
        } = p, _ = (E || "").split(`
`).length, H = D ? D.split(`
`).length : 0;
        w = D ? H + _ : _;
      }
      return Wd + w * mo;
    }
    const c = N(() => (i.value, s() > Kt));
    function f() {
      u.value = !u.value, n.value = u.value ? s() : Kt, d();
    }
    function l() {
      if (!i.value) return;
      i.value = null;
      const C = () => {
      };
      typeof requestIdleCallback < "u" ? requestIdleCallback(C, {
        timeout: 100
      }) : setTimeout(C, 0);
    }
    function d() {
      if (o.value) return;
      const p = r.value, C = i.value;
      if (!p || !(C != null && C.layout)) return;
      const k = p.clientWidth || p.offsetWidth, w = n.value;
      requestAnimationFrame(() => {
        var v, b;
        o.value || !i.value || (b = (v = i.value) == null ? void 0 : v.layout) == null || b.call(v, {
          width: k,
          height: w
        });
      });
    }
    function g() {
      var p;
      o.value || !r.value || !((p = e.content) != null && p.code) || qd.init().then((C) => {
        var A;
        if (o.value || !r.value || !((A = e.content) != null && A.code)) return;
        const {
          value: k,
          originalValue: w,
          language: v = "typescript"
        } = e.content.code, b = {
          readOnly: !0,
          minimap: {
            enabled: !1
          },
          scrollBeyondLastLine: !1,
          lineNumbers: "off",
          glyphMargin: !1,
          lineDecorationsWidth: 0,
          folding: !1,
          renderLineHighlight: "none",
          fontSize: 12,
          lineHeight: mo,
          padding: {
            top: 8,
            bottom: 8
          }
        };
        if (w) {
          const y = C.editor.createDiffEditor(r.value, {
            ...b,
            renderSideBySide: !1,
            renderOverviewRuler: !1
          });
          y.setModel({
            original: C.editor.createModel(w, v),
            modified: C.editor.createModel(k, v)
          }), y.getOriginalEditor().updateOptions({
            minimap: {
              enabled: !1
            }
          }), y.getModifiedEditor().updateOptions({
            minimap: {
              enabled: !1
            }
          }), nt(() => {
            var D;
            if (o.value) return;
            const E = (D = y.getContainerDomNode) == null ? void 0 : D.call(y);
            if (E) {
              const _ = E.querySelector('.diff-editor-cell.original, [class*="original"]');
              _ && (_.style.display = "none");
            }
          }), i.value = y;
        } else {
          const y = C.editor.create(r.value, {
            value: k,
            language: v,
            ...b
          });
          i.value = y;
        }
        n.value = Kt, nt(() => d());
      });
    }
    return _e(() => {
      Zd(() => {
        o.value || !r.value || g();
      });
    }), ce(t, (p) => {
      p && !o.value && nt(() => d());
    }), Bu(() => {
      o.value = !0, l();
    }), ce(() => {
      var p, C;
      return (C = (p = e.content) == null ? void 0 : p.code) == null ? void 0 : C.value;
    }, () => {
      o.value || (u.value ? n.value = s() : n.value = Kt, d());
    }), () => {
      const p = e.content;
      if (!p) return null;
      const {
        message: C,
        fileIcon: k,
        fileName: w,
        code: v
      } = p;
      return h("div", {
        class: "f-chat-message-coding"
      }, [h("div", {
        class: "f-chat-coding-message"
      }, [C]), h("div", {
        class: "f-chat-coding-card"
      }, [h("div", {
        class: "f-chat-coding-header",
        onClick: a,
        role: "button",
        tabindex: 0,
        onKeydown: (b) => b.key === "Enter" && a()
      }, [h("span", {
        class: "f-chat-coding-header-icon-slot"
      }, [h("span", {
        class: "f-chat-coding-header-icon"
      }, [h("img", {
        src: k,
        alt: "",
        onError: (b) => {
          var A;
          b.target.style.display = "none", (A = b.target.parentElement) == null || A.classList.add("icon-error");
        }
      }, null), h("span", {
        class: "f-chat-coding-header-icon-fallback"
      }, [Ae("📄")])]), h("span", {
        class: "f-chat-coding-header-expand"
      }, [h("i", {
        class: t.value ? "f-icon f-icon-arrow-chevron-down" : "f-icon f-icon-arrow-chevron-right"
      }, null)])]), h("span", {
        class: "f-chat-coding-header-filename"
      }, [w]), h("span", {
        class: "f-chat-coding-header-stats"
      }, [h("span", {
        class: "f-chat-coding-stat-add"
      }, [Ae("+"), v.addedLines]), h("span", {
        class: "f-chat-coding-stat-del"
      }, [Ae("-"), v.deletedLines])])]), h("div", {
        style: {
          display: t.value ? "block" : "none"
        }
      }, [h("div", {
        ref: r,
        class: "f-chat-coding-editor",
        style: {
          height: `${n.value}px`
        }
      }, null), c.value && h("button", {
        type: "button",
        class: "f-chat-coding-expand-btn",
        onClick: f,
        "aria-label": u.value ? "收起代码" : "展开代码",
        title: u.value ? "收起代码" : "展开代码"
      }, [h("i", {
        class: ["f-icon f-icon-arrow-chevron-down", u.value && "f-chat-coding-expand-icon-up"]
      }, null)])])])]);
    };
  }
});
mn.install = (e) => {
  e.component(mn.name, mn);
};
const Vd = {
  content: {
    type: Object,
    required: !0
  }
};
function Xd(e) {
  return "file" in e && "path" in e;
}
const gn = /* @__PURE__ */ Y({
  name: "FileOperationMessage",
  props: Vd,
  setup(e) {
    const t = V(!0), u = V({}), r = N(() => {
      var s;
      return !!((s = e.content) != null && s.summary);
    }), i = N(() => {
      var c;
      const s = (c = e.content) == null ? void 0 : c.summary;
      return s ? `浏览了 ${s.explored} 个文件并查询了 ${s.searched} 个文件` : "";
    });
    function n() {
      t.value = !t.value;
    }
    function o(s) {
      u.value = {
        ...u.value,
        [s]: !u.value[s]
      };
    }
    function a(s) {
      return u.value[s] ?? !1;
    }
    return () => {
      const s = e.content;
      if (!s)
        return null;
      const {
        summary: c,
        operations: f
      } = s, l = !r.value || t.value;
      return h("div", {
        class: "f-chat-message-file-operation"
      }, [c && h("div", {
        class: "f-chat-file-op-summary",
        onClick: n,
        role: "button",
        tabindex: 0,
        onKeydown: (d) => d.key === "Enter" && n()
      }, [h("span", {
        class: "f-chat-file-op-summary-inner"
      }, [h("span", {
        class: "f-chat-file-op-summary-text"
      }, [i.value]), h("span", {
        class: ["f-chat-file-op-expand-btn", {
          expanded: t.value
        }]
      }, [h("i", {
        class: t.value ? "f-icon f-icon-arrow-chevron-down" : "f-icon f-icon-arrow-chevron-right"
      }, null)])])]), l && h("div", {
        class: "f-chat-file-op-operations"
      }, [f.map((d, g) => {
        var p, C, k, w;
        return h("div", {
          key: g,
          class: "f-chat-file-op-operation"
        }, [h("div", Ln({
          class: ["f-chat-file-op-operation-row", {
            "op-read": d.type === "Read",
            "has-details": !!((p = d.details) != null && p.length)
          }],
          onClick: () => {
            var v;
            return ((v = d.details) == null ? void 0 : v.length) && o(g);
          }
        }, (C = d.details) != null && C.length ? {
          role: "button",
          tabIndex: 0
        } : {}, {
          onKeydown: (v) => {
            var b;
            return ((b = d.details) == null ? void 0 : b.length) && v.key === "Enter" && o(g);
          }
        }), [h("span", {
          class: "f-chat-file-op-type"
        }, [d.type]), h("span", {
          class: "f-chat-file-op-message-wrap"
        }, [h("span", {
          class: "f-chat-file-op-message"
        }, [d.message]), (k = d.details) != null && k.length ? h("span", {
          class: ["f-chat-file-op-expand-btn", "sm", {
            expanded: a(g)
          }]
        }, [h("i", {
          class: a(g) ? "f-icon f-icon-arrow-chevron-down" : "f-icon f-icon-arrow-chevron-right"
        }, null)]) : null])]), ((w = d.details) == null ? void 0 : w.length) && a(g) && h("div", {
          class: "f-chat-file-op-details"
        }, [d.details.map((v, b) => Xd(v) ? h("div", {
          key: b,
          class: "f-chat-file-op-detail-file"
        }, [h("span", {
          class: "f-chat-file-op-file-icon"
        }, [h("img", {
          src: v.icon,
          alt: "",
          onError: (A) => {
            const y = A.target;
            y.style.display = "none";
            const E = y.parentElement;
            E && E.classList.add("icon-error");
          }
        }, null), h("span", {
          class: "f-chat-file-op-file-icon-fallback"
        }, [Ae("📄")])]), h("span", {
          class: "f-chat-file-op-file-name"
        }, [v.file]), h("span", {
          class: "f-chat-file-op-file-path",
          title: v.path
        }, [v.path])]) : h("div", {
          key: b,
          class: "f-chat-file-op-detail-text"
        }, [h("div", {
          class: "f-chat-file-op-detail-title"
        }, [v.title]), h("div", {
          class: "f-chat-file-op-detail-content"
        }, [v.text])]))])]);
      })])]);
    };
  }
});
gn.install = (e) => {
  e.component(gn.name, gn);
};
const Yd = {
  visible: {
    type: Boolean,
    default: !0
  },
  /** 描述 */
  description: [String, Object],
  /** 当前进度百分比，0~100 */
  progress: {
    type: Number,
    default: 0
  },
  /** 是否显示进度条 */
  showProgress: {
    type: Boolean,
    default: !0
  },
  /** 图标（可选） */
  icon: { type: [String, Object], default: "" },
  /** 自定义类名 */
  customClass: {
    type: Object,
    default: ""
  },
  /** 自定义样式 */
  customStyle: {
    type: Object,
    default: ""
  },
  /** 各部分自定义样式 */
  styles: {
    type: Object,
    default: () => ({})
  },
  /** 各部分自定义类名 */
  classNames: {
    type: Object,
    default: () => ({})
  }
}, Qd = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20width='60px'%20height='60px'%20viewBox='0%200%2060%2060'%20version='1.1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%3e%3ctitle%3e智能logo60px%3c/title%3e%3cdefs%3e%3clinearGradient%20x1='50%25'%20y1='0%25'%20x2='50%25'%20y2='100%25'%20id='linearGradient-1'%3e%3cstop%20stop-color='%230D7FE6'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%231EBBC6'%20offset='58.0673923%25'%3e%3c/stop%3e%3cstop%20stop-color='%232AE7AF'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cpath%20d='M25.1971977,0%20L45.8523137,11.3712178%20L45.8523137,37.6155801%20L44.4946453,38.9692599%20L24.623,28.022%20L24.6233274,49.9395377%20L21.4535582,49.9395377%20L2.72549351,39.5965647%20L0,34.4406135%20L0,12.8076673%20L3.70534859,10.5019677%20L20.556,20.546%20L20.5567534,0.161454345%20L25.1971977,0%20Z%20M20.7578212,28.1498874%20L5.81325199,36.7628182%20L20.7578212,45.0027895%20L20.7578212,28.1498874%20Z%20M41.8027832,15.9256338%20L26.7716137,24.6706076%20L41.8027832,32.9879669%20L41.8027832,15.9256338%20Z%20M4.06159924,15.4742393%20L4.06159924,32.9879669%20L19.1488772,24.4568004%20L4.06159924,15.4742393%20Z%20M24.6233274,4.32908173%20L24.6233274,21.2862528%20L39.8727429,12.4882393%20L24.6233274,4.32908173%20Z'%20id='path-2'%3e%3c/path%3e%3clinearGradient%20x1='81.0966666%25'%20y1='38.5584607%25'%20x2='28.8545509%25'%20y2='61.9626707%25'%20id='linearGradient-4'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-5'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='44.8152906%25'%20y1='77.6521765%25'%20x2='44.8152906%25'%20y2='3.26462903%25'%20id='linearGradient-6'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-7'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='3.93796935%25'%20y1='32.607826%25'%20x2='78.9687461%25'%20y2='60.0462823%25'%20id='linearGradient-8'%3e%3cstop%20stop-color='%23FFFFFF'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3cfilter%20x='0.0%25'%20y='0.0%25'%20width='100.0%25'%20height='100.0%25'%20filterUnits='objectBoundingBox'%20id='filter-9'%3e%3cfeGaussianBlur%20stdDeviation='0'%20in='SourceGraphic'%3e%3c/feGaussianBlur%3e%3c/filter%3e%3clinearGradient%20x1='56.0769337%25'%20y1='45.0797149%25'%20x2='24.9463054%25'%20y2='71.1433818%25'%20id='linearGradient-10'%3e%3cstop%20stop-color='%23159BD7'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3clinearGradient%20x1='10.434388%25'%20y1='68.063656%25'%20x2='86.6988821%25'%20y2='30.8651063%25'%20id='linearGradient-11'%3e%3cstop%20stop-color='%2321C6C1'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%23FFFFFF'%20stop-opacity='0'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3clinearGradient%20x1='50%25'%20y1='0%25'%20x2='50%25'%20y2='100%25'%20id='linearGradient-12'%3e%3cstop%20stop-color='%230D7FE6'%20offset='0%25'%3e%3c/stop%3e%3cstop%20stop-color='%232AE7AF'%20offset='100%25'%3e%3c/stop%3e%3c/linearGradient%3e%3c/defs%3e%3cg%20id='页面-1'%20stroke='none'%20stroke-width='1'%20fill='none'%20fill-rule='evenodd'%3e%3cg%20id='生成过程'%20transform='translate(-766,%20-1268)'%3e%3cg%20id='编组-7'%20transform='translate(321,%20699)'%3e%3cg%20id='编组-5'%20transform='translate(247,%20488)'%3e%3cg%20id='智能logo60px'%20transform='translate(198,%2081)'%3e%3crect%20id='矩形'%20x='0'%20y='0'%20width='60'%20height='60'%3e%3c/rect%3e%3cg%20id='编组-35'%20transform='translate(0.8571,%200.8571)'%3e%3crect%20id='矩形'%20x='0'%20y='0'%20width='58.2857143'%20height='58.2857143'%3e%3c/rect%3e%3cg%20id='编组-19备份-17'%20transform='translate(3.4286,%201.7143)'%3e%3cpath%20d='M27.9148216,2.78182535%20L48.5699376,14.1530432%20L48.5699376,40.3974054%20L47.2122691,41.7510852%20L27.3406238,30.8038254%20L27.3409512,52.7213631%20L24.171182,52.7213631%20L5.44311735,42.3783901%20L2.71762384,37.2224388%20L2.71762384,15.5894926%20L6.42297243,13.283793%20L23.2736238,23.3278254%20L23.2743772,2.9432797%20L27.9148216,2.78182535%20Z%20M23.4754451,30.9317128%20L8.53087583,39.5446435%20L23.4754451,47.7846148%20L23.4754451,30.9317128%20Z%20M44.520407,18.7074592%20L29.4892375,27.452433%20L44.520407,35.7697922%20L44.520407,18.7074592%20Z%20M6.77922307,18.2560647%20L6.77922307,35.7697922%20L21.866501,27.2386257%20L6.77922307,18.2560647%20Z%20M27.3409512,7.11090709%20L27.3409512,24.0680782%20L42.5903667,15.2700646%20L27.3409512,7.11090709%20Z'%20id='形状结合'%20fill='url(%23linearGradient-1)'%3e%3c/path%3e%3cg%20id='路径-2-+-路径-3-+-路径-4蒙版'%20transform='translate(2.7176,%202.7818)'%3e%3cmask%20id='mask-3'%20fill='white'%3e%3cuse%20xlink:href='%23path-2'%3e%3c/use%3e%3c/mask%3e%3cuse%20id='蒙版'%20fill='url(%23linearGradient-1)'%20xlink:href='%23path-2'%3e%3c/use%3e%3cpolygon%20id='路径-2'%20fill='url(%23linearGradient-4)'%20filter='url(%23filter-5)'%20mask='url(%23mask-3)'%20points='14.177196%2023.2632694%2022.5796859%2023.2632694%2023.4218687%2027.5957059%209.52757789%2036.9780352%203.7254788%2029.0812693'%3e%3c/polygon%3e%3cpolygon%20id='路径-3'%20fill='url(%23linearGradient-6)'%20filter='url(%23filter-7)'%20mask='url(%23mask-3)'%20points='23.4218687%2022.4125055%2027.1161878%2015.1091341%2027.8042533%206.35665145%2018.1506617%205.88610282%2018.8417696%2016.8706238%2022.5796859%2022.4125055'%3e%3c/polygon%3e%3cpolygon%20id='路径-4'%20fill='url(%23linearGradient-8)'%20filter='url(%23filter-9)'%20mask='url(%23mask-3)'%20points='33.5501273%2024.6706076%2024.403058%2024.9983902%2024.403058%2027.5289361%2028.4733448%2033.3539069%2036.4355638%2036.3335669%2041.6970622%2028.387534'%3e%3c/polygon%3e%3c/g%3e%3cpath%20d='M27.9148216,2.78182535%20L48.5699376,14.1530432%20L48.5699376,40.3974054%20L47.2122691,41.7510852%20L23.2743772,28.5628437%20L23.2743772,2.9432797%20L27.9148216,2.78182535%20Z%20M27.3409512,7.11090709%20L27.3409512,24.0680782%20L28.3053772,23.5108254%20L28.3061985,25.7112082%20L30.1053772,27.0928254%20L29.4892375,27.452433%20L44.520407,35.7697922%20L44.5203772,18.7198254%20L45.4350062,17.1793767%20L42.5903667,15.2700646%20L27.3409512,7.11090709%20Z'%20id='形状结合'%20fill='url(%23linearGradient-10)'%20fill-rule='nonzero'%3e%3c/path%3e%3cpolygon%20id='路径'%20fill='url(%23linearGradient-11)'%20fill-rule='nonzero'%20points='22.5927693%2026.8440709%2023.6315003%2030.8033921%208.53087583%2039.5446435%207.30516741%2035.4601402'%3e%3c/polygon%3e%3cg%20id='编组-21'%20fill='url(%23linearGradient-12)'%3e%3cpath%20d='M25.4312165,33.1398658%20C28.857043,33.1398658%2031.634224,30.3626848%2031.634224,26.9368583%20C31.634224,23.5110318%2028.857043,20.7338508%2025.4312165,20.7338508%20C22.00539,20.7338508%2019.228209,23.5110318%2019.228209,26.9368583%20C19.228209,30.3626848%2022.00539,33.1398658%2025.4312165,33.1398658%20Z%20M46.5950591,20.103577%20C49.2645342,20.103577%2051.4285714,17.9395398%2051.4285714,15.2700646%20C51.4285714,12.6005895%2049.2645342,10.4365523%2046.5950591,10.4365523%20C43.9255839,10.4365523%2041.7615467,12.6005895%2041.7615467,15.2700646%20C41.7615467,17.9395398%2043.9255839,20.103577%2046.5950591,20.103577%20Z%20M25.4312165,54.9048659%20C28.1006917,54.9048659%2030.2647289,52.7408287%2030.2647289,50.0713536%20C30.2647289,47.4018784%2028.1006917,45.2378412%2025.4312165,45.2378412%20C22.7617413,45.2378412%2020.5977042,47.4018784%2020.5977042,50.0713536%20C20.5977042,52.7408287%2022.7617413,54.9048659%2025.4312165,54.9048659%20Z%20M4.83351235,43.462539%20C7.50298751,43.462539%209.6670247,41.2985018%209.6670247,38.6290267%20C9.6670247,35.9595515%207.50298751,33.7955143%204.83351235,33.7955143%20C2.16403719,33.7955143%200,35.9595515%200,38.6290267%20C0,41.2985018%202.16403719,43.462539%204.83351235,43.462539%20Z%20M25.4312165,8.37808808%20C27.7447616,8.37808808%2029.6202605,6.50258918%2029.6202605,4.18904404%20C29.6202605,1.8754989%2027.7447616,0%2025.4312165,0%20C23.1176714,0%2021.2421725,1.8754989%2021.2421725,4.18904404%20C21.2421725,6.50258918%2023.1176714,8.37808808%2025.4312165,8.37808808%20Z%20M46.5950591,43.3044363%20C48.9086042,43.3044363%2050.7841031,41.4289374%2050.7841031,39.1153922%20C50.7841031,36.8018471%2048.9086042,34.9263482%2046.5950591,34.9263482%20C44.2815139,34.9263482%2042.406015,36.8018471%2042.406015,39.1153922%20C42.406015,41.4289374%2044.2815139,43.3044363%2046.5950591,43.3044363%20Z%20M4.83351235,18.3420872%20C7.14705749,18.3420872%209.02255639,16.4665883%209.02255639,14.1530432%20C9.02255639,11.8394981%207.14705749,9.96399915%204.83351235,9.96399915%20C2.51996721,9.96399915%200.644468314,11.8394981%200.644468314,14.1530432%20C0.644468314,16.4665883%202.51996721,18.3420872%204.83351235,18.3420872%20Z'%20id='形状结合'%3e%3c/path%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/svg%3e", bn = /* @__PURE__ */ Y({
  name: "FXGenerateProcess",
  props: Yd,
  emits: ["closed"],
  setup(e, t) {
    const u = N(() => {
      const c = {
        "fx-generate-process": !0,
        "fx-generate-process--no-progress": !e.showProgress
      };
      return De(c, e.customClass);
    }), r = N(() => Te({}, e.customStyle));
    function i() {
      var c, f;
      return t.slots.icon ? t.slots.icon() : h("div", {
        class: ["fx-generate-process--icon", (c = e.classNames) == null ? void 0 : c.icon],
        style: (f = e.styles) == null ? void 0 : f.icon
      }, [e.icon ? Rr(e.icon) : h("img", {
        alt: "ai logo",
        class: "fx-generate-process--icon-default",
        src: Qd
      }, null)]);
    }
    function n() {
      var c, f;
      return e.description && h("p", {
        class: ["fx-generate-process--description", (c = e.classNames) == null ? void 0 : c.description],
        style: (f = e.styles) == null ? void 0 : f.description
      }, [e.description]);
    }
    function o() {
      var c, f;
      return e.progress > 0 && h("div", {
        class: ["fx-generate-process--progress-text", (c = e.classNames) == null ? void 0 : c["progress-text"]],
        style: (f = e.styles) == null ? void 0 : f["progress-text"]
      }, [e.progress, Ae("%")]);
    }
    function a() {
      return h("div", {
        class: "fx-generate-process--mask",
        onClick: (c) => {
          c.stopPropagation();
        }
      }, null);
    }
    function s(c = () => {
    }) {
      t.emit("closed", {
        callback: c
      });
    }
    return ce(() => e.visible, (c) => {
      c || s();
    }), t.expose({
      close: s
    }), () => {
      var c, f;
      return h(ut, null, [e.visible && a(), e.visible && h("div", {
        class: u.value,
        style: r.value
      }, [i(), !e.showProgress && n(), e.showProgress && h("div", {
        class: ["fx-generate-process--progress-bar", (c = e.classNames) == null ? void 0 : c["progress-bar"]],
        style: (f = e.styles) == null ? void 0 : f["progress-bar"]
      }, [h("div", {
        class: "fx-generate-process--progress-fill",
        style: {
          width: `${e.progress}%`
        }
      }, null), !e.description && o()]), e.description && e.progress > 0 && h("div", {
        class: "fx-generate-process--progress"
      }, [n(), Ae(" "), o()])])]);
    };
  }
});
bn.install = (e) => {
  e.component(bn.name, bn);
};
const Kd = {
  title: {
    type: String,
    default: "历史对话"
  },
  items: {
    type: Array,
    default: () => []
  }
}, Jd = [{
  key: "today",
  label: "今天"
}, {
  key: "week",
  label: "近7天"
}, {
  key: "older",
  label: "更早"
}], vn = /* @__PURE__ */ Y({
  name: "FXChatHistory",
  props: Kd,
  emits: ["itemClick"],
  setup(e, {
    emit: t
  }) {
    const u = (o) => {
      const a = new Date(o), s = /* @__PURE__ */ new Date();
      return a.getDate() === s.getDate() && a.getMonth() === s.getMonth() && a.getFullYear() === s.getFullYear();
    }, r = (o) => {
      const a = new Date(o), s = /* @__PURE__ */ new Date();
      return s.setDate(s.getDate() - 7), a >= s && !u(o);
    }, i = N(() => {
      var s;
      const o = {
        today: [],
        week: [],
        older: []
      };
      (s = e.items) == null || s.forEach((c) => {
        u(c.timestamp) ? o.today.push(c) : r(c.timestamp) ? o.week.push(c) : o.older.push(c);
      });
      const a = (c, f) => f.timestamp - c.timestamp;
      return o.today.sort(a).length || o.week.sort(a).length || o.older.sort(a).length ? {
        today: o.today.sort(a),
        week: o.week.sort(a),
        older: o.older.sort(a)
      } : null;
    }), n = (o, a) => a.length > 0 && h("div", {
      class: "f-chat-history-section"
    }, [h("span", {
      class: "f-chat-history-section-header"
    }, [o]), h("div", {
      class: "d-flex flex-column"
    }, [a.map((s) => h("div", {
      key: s.id,
      class: "f-chat-history-item",
      onClick: () => t("itemClick", s)
    }, [h("span", {
      class: "f-chat-history-item-title"
    }, [s.title])]))])]);
    return () => h("div", {
      class: "f-chat-history-manager"
    }, [h("div", {
      class: "f-chat-history-manager-scroll"
    }, [i.value && Jd.map((o) => n(o.label, i.value[o.key]))])]);
  }
});
vn.install = (e) => {
  e.component(vn.name, vn);
};
_u.install = (e) => {
  e.component(_u.name, _u);
};
const e1 = {
  /** 包含多个提示项的列表 */
  items: {
    type: Array,
    default: () => []
  },
  /** 显示在提示列表顶部的标题 */
  title: {
    type: [String, Object],
    default: ""
  },
  /** 提示列表是否垂直排列 */
  vertical: {
    type: Boolean,
    default: !1
  },
  /** 提示列表是否换行 */
  wrap: {
    type: Boolean,
    default: !1
  },
  /** 间距 */
  gap: {
    type: [String, Number],
    default: 12
  },
  /** 是否开启渲染渐入 */
  fadeIn: {
    type: Boolean,
    default: !1
  },
  /** 是否开启渲染从左到右渐入 */
  fadeInLeft: {
    type: Boolean,
    default: !1
  },
  /** 自定义样式 */
  styles: {
    type: Object,
    default: () => ({})
  },
  /** 自定义样式类名 */
  classNames: {
    type: Object,
    default: () => ({})
  },
  /** 组件自定义样式类名 */
  customClass: {
    type: Object,
    default: ""
  },
  /** 组件自定义样式 */
  customStyle: {
    type: Object,
    default: ""
  }
};
var xa = /* @__PURE__ */ ((e) => (e.standardFeatureCard = "standard-feature-card", e.primaryFeatureCard = "primary-feature-card", e.compactFeatureCard = "compact-feature-card", e.standardQuestionItem = "standard-question-item", e.functionEntryItem = "function-entry-item", e.defaultTextItem = "default-text-item", e.hasNestEntryItem = "has-nest-entry-item", e.likeButtonEntryItem = "like-button-entry-item", e.none = "", e))(xa || {});
const t1 = {
  /** 唯一标识 */
  id: {
    type: [String, Number],
    default: ""
  },
  /** 提示图标 
   *  支持：图标字符、图片 URL、VNode
  */
  icon: {
    type: [String, Object],
    default: ""
  },
  /** 提示标签 */
  label: {
    type: [String, Object],
    default: ""
  },
  /** 提示描述 */
  description: {
    type: [String, Object],
    default: ""
  },
  badge: {
    type: [String, Object],
    default: ""
  },
  /** 是否禁用 */
  disabled: {
    type: Boolean,
    default: !1
  },
  /** 子项（嵌套） */
  children: {
    type: Array,
    default: () => []
  },
  /** 自定义样式 key: value */
  styles: {
    type: Object
  },
  /** 自定义样式类名 key: value*/
  classNames: {
    type: Object
  },
  /** 组件自定义样式类名 */
  customClass: {
    type: Object,
    default: ""
  },
  /** 组件自定义样式 */
  customStyle: {
    type: Object,
    default: ""
  },
  /**
   * standard-feature-card ：标准规格功能卡片
   * primary-feature-card：核心主功能卡尺寸大
   * compact-feature-card：紧凑型功能卡片
   * standard-question-item：标准规格问题项
   * default-text-item：标准规格文本项
   */
  showType: {
    type: String,
    default: xa.defaultTextItem
  },
  gap: {
    type: [String, Number]
  },
  /** 点击整项回调（演示/列表场景） */
  onClick: {
    type: Function,
    required: !1
  }
}, Ir = /* @__PURE__ */ Y({
  name: "FPrompt",
  props: t1,
  setup(e) {
    const t = N(() => !e.id && e.children && e.children.length > 0), u = N(() => {
      var d;
      let l = {
        "fx-prompt--item-wrapper": !0,
        "fx-prompt--item-disabled": e.disabled,
        // 存在当做容器展示多个情况
        "fx-prompt--item-has-nest": e.id && e.children && e.children.length > 0
      };
      return l = De(l, (d = e.classNames) == null ? void 0 : d.item), De(l, e.customClass);
    }), r = N(() => {
      let l = {
        "fx-prompt--item": !0
      };
      return l[`fx-prompt--${e.showType || "none"}`] = !0, l;
    }), i = N(() => {
      var d;
      const l = Te({}, (d = e.styles) == null ? void 0 : d.item);
      return Te(l, e.customStyle);
    }), n = () => {
      var l, d;
      return e.icon ? h("div", {
        class: ["fx-prompt--item-icon", (l = e.classNames) == null ? void 0 : l.icon],
        style: (d = e.styles) == null ? void 0 : d.icon
      }, [Rr(e.icon)]) : null;
    }, o = () => {
      var l, d;
      return e.label ? h("h6", {
        class: ["fx-prompt--item-label", (l = e.classNames) == null ? void 0 : l.label],
        style: (d = e.styles) == null ? void 0 : d.label
      }, [un(e.label)]) : null;
    };
    function a() {
      var d;
      const l = {
        "fx-prompt--item-badge": !0
      };
      return typeof e.badge == "string" && (l["badge-default"] = !0), De(l, (d = e.classNames) == null ? void 0 : d.badge);
    }
    const s = () => {
      var l;
      return e.badge ? h("span", {
        class: a(),
        style: (l = e.styles) == null ? void 0 : l.badge
      }, [un(e.badge)]) : null;
    }, c = () => {
      var l, d;
      return e.description ? h("p", {
        class: ["fx-prompt--item-description", (l = e.classNames) == null ? void 0 : l.description],
        style: (d = e.styles) == null ? void 0 : d.description
      }, [un(e.description)]) : null;
    }, f = () => {
      var l, d, g, p;
      return !e.children || e.children.length === 0 ? null : h(Eu, {
        class: {
          "fx-prompt--only-children": !e.id,
          "fx-prompt--item-nested": e.id
        },
        gap: e.gap,
        items: e.children,
        vertical: !0,
        customClass: (l = e.classNames) == null ? void 0 : l.subItems,
        customStyle: (d = e.styles) == null ? void 0 : d.subItems,
        styles: {
          item: ((g = e.styles) == null ? void 0 : g.subItem) ?? {}
        },
        classNames: {
          item: ((p = e.classNames) == null ? void 0 : p.subItem) ?? ""
        }
      }, null);
    };
    return () => {
      var l, d;
      return h("div", {
        class: u.value,
        style: i.value,
        onClick: e.onClick
      }, [t.value ? f() : h("div", {
        class: r.value
      }, [n(), s(), h("div", {
        class: ["fx-prompt--item-content", (l = e.classNames) == null ? void 0 : l.itemContent],
        style: (d = e.styles) == null ? void 0 : d.itemContent
      }, [o(), c(), f()])])]);
    };
  }
}), Eu = /* @__PURE__ */ Y({
  name: "FXPrompts",
  props: e1,
  emits: ["item-click"],
  setup(e, t) {
    const u = N(() => {
      var f;
      let c = {
        "fx-prompts": !0,
        "fx-prompts--fade-in": e.fadeIn,
        "fx-prompts--fade-in-left": e.fadeInLeft
      };
      return c = De(c, e.customClass), c = De(c, (f = e.classNames) == null ? void 0 : f.root), c;
    });
    function r(c = null) {
      var l;
      let f = {
        "fx-prompts--items": !0,
        "fx-prompt": !0,
        "fx-prompts--items-wrap": e.wrap,
        "fx-prompts--items-vertical": e.vertical
      };
      return f = De(f, (l = e.classNames) == null ? void 0 : l.items), f = De(f, c == null ? void 0 : c.customClass), f;
    }
    function i(c = null) {
      var l;
      let f = {};
      return (e.gap || e.gap === 0) && (f.gap = typeof e.gap == "number" ? `${e.gap}px` : e.gap), f = Te(f, (l = e.styles) == null ? void 0 : l.items), f = Te(f, c == null ? void 0 : c.customStyle), f;
    }
    const n = (c, f) => {
      f.disabled || f.children && f.children.length > 0 || t.emit("item-click", c, f);
    }, o = (c) => {
      var f, l;
      return c != null && c.title ? h("h5", {
        class: ["fx-prompts--title", (f = e.classNames) == null ? void 0 : f.title],
        style: (l = e.styles) == null ? void 0 : l.title
      }, [un(c == null ? void 0 : c.title)]) : null;
    };
    function a(c) {
      return !c.items || c.items.length === 0 ? null : h("div", {
        class: r(c),
        style: i(c)
      }, [c.items.map((f, l) => h(Ir, {
        key: f.id || `key_${l}`,
        id: f.id,
        icon: f.icon,
        label: f.label,
        description: f.description,
        disabled: f.disabled,
        children: f.children,
        styles: f.styles || e.styles,
        classNames: f.classNames || e.classNames,
        showType: f.showType,
        customClass: f.customClass,
        customStyle: f.customStyle,
        gap: f.gap,
        badge: f.badge,
        onClick: (d) => n(d, f)
      }, null))]);
    }
    function s() {
      return t.slots.footer ? t.slots.footer() : null;
    }
    return () => {
      var c;
      return h("div", {
        class: u.value,
        style: (c = e.styles) == null ? void 0 : c.root
      }, [t.slots.title && t.slots.title(), o(e), t.slots.default && t.slots.default(), a(e), s()]);
    };
  }
});
Eu.install = (e) => {
  e.component(Eu.name, Eu), e.component(Ir.name, Ir);
};
const u1 = {
  /** 快捷指令建议项 */
  items: {
    type: Array,
    default: () => []
  },
  /** 建议项面板高度 */
  height: {
    type: Number,
    default: 200
  },
  /** 显示在建议项列表顶部的标题 */
  title: {
    type: [String, Object],
    default: "推荐操作"
  },
  prompt: {
    type: [String, Object],
    default: "输入@获取推荐操作"
  },
  promptChar: {
    type: String,
    default: "@"
  },
  promptAgentName: {
    type: String,
    default: "AI助理"
  }
}, xn = /* @__PURE__ */ Y({
  name: "FXSuggestion",
  props: u1,
  setup(e, t) {
    const u = V(null), r = V(!1), i = V(!1), n = V({
      top: 0,
      left: 0,
      height: 0
    }), o = V(-1), a = V(""), s = N(() => typeof e.prompt == "string" ? e.prompt : "输入“@”获取推荐操作"), c = N(() => {
      var w;
      return (((w = e.items) == null ? void 0 : w.length) ?? 0) === 0;
    }), f = () => {
      var H;
      if (!u.value || c.value) return;
      if ((((H = u.value.textContent) == null ? void 0 : H.trim()) || "") === "") {
        u.value.textContent = "", u.value.innerHTML = "", C();
        return;
      }
      const v = window.getSelection();
      if (!v || v.rangeCount === 0) return;
      const b = v.getRangeAt(0), A = b.cloneRange();
      A.selectNodeContents(u.value), A.setEnd(b.endContainer, b.endOffset);
      const y = A.toString(), E = y.lastIndexOf(e.promptChar);
      if (a.value = u.value.textContent || "", E !== -1 && y.substring(E + 1).trim() === "" && (u.value.textContent = y.replace(/@$/, `@${e.promptAgentName} `), a.value = u.value.textContent, r.value = !0, b.selectNodeContents(u.value), b.collapse(!1), v.removeAllRanges(), v.addRange(b)), r.value === !1) {
        i.value = !1, o.value = -1;
        return;
      }
      if ((u.value.textContent || "").lastIndexOf(`@${e.promptAgentName} `) !== -1) {
        const G = document.createRange();
        G.setStart(u.value, 0), G.setEnd(b.endContainer, b.endOffset);
        const {
          top: P,
          right: F
        } = G.getBoundingClientRect(), L = l();
        n.value = {
          top: P - L - 5,
          left: F + 5,
          height: L
        }, o.value === -1 && (o.value = 0), i.value = !0;
      } else
        i.value = !1, o.value = -1;
    }, l = () => {
      const v = e.items.length * 38 - 6;
      return Math.min(v + 28 + 20, e.height);
    }, d = (w) => {
      var y;
      if (!u.value) return;
      const v = window.getSelection();
      if (!v || v.rangeCount === 0) return;
      const b = ((y = u.value.textContent) == null ? void 0 : y.replace(/\s*$/, "")) || "";
      u.value.textContent = `${b} ${w.label}`;
      const A = v.getRangeAt(0);
      A.selectNodeContents(u.value), A.collapse(!1), v.removeAllRanges(), v.addRange(A), C();
    }, g = async (w) => {
      if (!i.value || !e.items || e.items.length === 0) return;
      switch (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(w.key) && w.preventDefault(), w.key) {
        case "ArrowDown":
          o.value++, o.value >= e.items.length && (o.value = 0);
          break;
        case "ArrowUp":
          o.value--, o.value < 0 && (o.value = e.items.length - 1);
          break;
        case "Enter":
          o.value !== -1 && d(e.items[o.value]);
          break;
        case "Escape":
          C();
          break;
      }
      await nt();
      const v = o.value > 0 ? ".f-chat-suggestion-panel-item--current" : ".f-chat-suggestion-panel-header", b = document.querySelector(v);
      b == null || b.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }, p = (w) => {
      u.value && !u.value.contains(w.target) && C();
    }, C = () => {
      r.value = !1, i.value = !1, o.value = -1;
    };
    _e(() => {
      document.addEventListener("click", p);
    }), Or(() => {
      document.removeEventListener("click", p);
    });
    const k = (w) => {
      const v = w.iconUrl || "", b = w.icon || "f-icon f-icon-task-record";
      return h(ut, null, [v ? h("img", {
        alt: "suggestion item icon",
        src: v
      }, null) : h("i", {
        class: b
      }, null), h("span", {
        class: "f-chat-suggestion-panel-item-label"
      }, [w.label])]);
    };
    return () => {
      var w;
      return h("div", {
        class: "f-chat-suggestion-container"
      }, [h("div", {
        ref: u,
        class: "f-chat-suggestion-input",
        contenteditable: "true",
        onInput: f,
        onKeyup: f,
        onKeydown: g,
        "data-placeholder": s.value
      }, null), i.value && h("div", {
        class: "f-chat-suggestion-panel",
        style: {
          top: `${n.value.top}px`,
          left: `${n.value.left}px`,
          height: `${n.value.height}px`
        }
      }, [h("div", {
        class: "f-chat-suggestion-panel-header"
      }, [e.title]), h("div", {
        class: "f-chat-suggestion-panel-container"
      }, [(w = e.items) == null ? void 0 : w.map((v, b) => h("div", {
        key: b,
        class: ["f-chat-suggestion-panel-item", {
          "f-chat-suggestion-panel-item--current": b === o.value
        }],
        onClick: () => d(v),
        onMouseenter: () => o.value === b
      }, [k(v)]))])])]);
    };
  }
});
xn.install = (e) => {
  e.component(xn.name, xn);
};
const n1 = {
  type: {
    type: String,
    default: "Todo"
  },
  /** 消息标题，显示在列表外部 */
  message: {
    type: String,
    default: ""
  },
  /** 待办事项列表 */
  items: { type: Array, default: [] },
  customClass: {
    type: String,
    default: ""
  }
}, yn = /* @__PURE__ */ Y({
  name: "Todo",
  props: n1,
  setup(e) {
    const t = V(!0), u = N(() => {
      var i;
      return (i = e.items) == null ? void 0 : i.length;
    });
    function r() {
      t.value = !t.value;
    }
    return () => h("div", {
      class: ["f-chat-message-todo", e.customClass]
    }, [h("div", {
      class: "f-chat-todo-message"
    }, [e.message]), h("div", {
      class: "f-chat-todo-list"
    }, [h("div", {
      class: "f-chat-todo-header",
      onClick: r,
      role: "button",
      tabindex: 0,
      onKeydown: (i) => i.key === "Enter" && r()
    }, [h("span", {
      class: "f-chat-todo-header-icon-slot"
    }, [h("span", {
      class: "f-chat-todo-header-icon"
    }, [h("i", {
      class: "f-icon f-icon-task-record"
    }, null)]), h("span", {
      class: "f-chat-todo-header-expand"
    }, [h("i", {
      class: t.value ? "f-icon f-icon-arrow-chevron-down" : "f-icon f-icon-arrow-chevron-right"
    }, null)])]), h("span", {
      class: "f-chat-todo-header-label"
    }, [Ae("待办任务")]), h("span", {
      class: "f-chat-todo-header-count"
    }, [u.value])]), t.value && h("div", {
      class: "f-chat-todo-content"
    }, [h(_n, {
      items: e.items
    }, null)])])]);
  }
});
yn.install = (e) => {
  e.component(yn.name, yn), e.component(_n.name, _n), e.component(pr.name, pr);
};
const r1 = {
  /** 图标 */
  icon: [String, Object],
  /** 标题 */
  title: [String, Object],
  /** 描述 */
  description: [String, Object],
  customClass: {
    type: Object,
    default: ""
  },
  customStyle: {
    type: Object,
    default: ""
  },
  /** 自定义样式 */
  styles: {
    type: Object,
    default: () => ({})
  },
  /** 自定义样式类名 */
  classNames: {
    type: Object,
    default: () => ({})
  }
}, An = /* @__PURE__ */ Y({
  name: "FXWelcome",
  props: r1,
  emits: [],
  setup(e, t) {
    const u = N(() => {
      const o = {
        "fx-welcome": !0
      };
      return !e.description && (e.icon || t.slots.icon) && (o["fx-welcome--no-description"] = !0), De(o, e.customClass);
    }), r = N(() => Te({}, e.customStyle));
    function i() {
      var o, a;
      return t.slots.icon ? t.slots.icon() : e.icon ? h("div", {
        class: ["fx-welcome--icon", (o = e.classNames) == null ? void 0 : o.icon],
        style: (a = e.styles) == null ? void 0 : a.icon
      }, [Rr(e.icon)]) : null;
    }
    function n() {
      var o, a, s, c, f, l;
      return t.slots.content ? h("div", {
        class: "fx-welcome--content"
      }, [t.slots.content()]) : (e.title || e.description) && h("div", {
        class: ["fx-welcome--content", (o = e.classNames) == null ? void 0 : o.content],
        style: (a = e.styles) == null ? void 0 : a.content
      }, [e.title && h("h4", {
        class: ["fx-welcome--title", (s = e.classNames) == null ? void 0 : s.title],
        style: (c = e.styles) == null ? void 0 : c.title
      }, [e.title]), e.description && h("p", {
        class: ["fx-welcome--description", (f = e.classNames) == null ? void 0 : f.description],
        style: (l = e.styles) == null ? void 0 : l.description
      }, [e.description])]);
    }
    return () => h("div", {
      class: u.value,
      style: r.value
    }, [i(), n()]);
  }
});
An.install = (e) => {
  e.component(An.name, An);
};
const i1 = {
  content: {
    type: Object,
    required: !0
  },
  onOpen: {
    type: Function
  }
}, o1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAHHUlEQVRYCV2XSY8VVRTHT9UbgAbpZpSmaRNMxIiGqZVEE1csXBoNboyJ23ahfgI/gQuXdiRx6UY2utKNEUJjQLrBEEwUmQcBBZuphzdU+fufc+tVw61Xde894/+ce+6tepml9uKhpYMbVpWTuWUTpZUjQc7oSnvUMZvvVZJO8om4ZjzLUmK2bqVZO4g+r3hLfbMHi5plc1lZztBPnftkxeGkbfbCocUvW5lNrl+ZYQdLaurCv3UKs7mlNIHuo9RXsqJtHuKZwFRmxH+4ZLbYq3mS5Z76/dOVH2WKvCjLb1e3zHQPHEszIZDNfxY0AyAT9QNHSaoJaf0KV4qHApAcBu8+NisqwBUdO3mevZcT8aRE27mEaamLCdJShEaGknM4QkQLIJqbrWgsUwy2M3osnYtDS2qDQVlkkwDIJjKYrUbSSp0bDy96ugPJeYbUsyyRjbDXwpK31HkkjDusv5rsPa1PPUzkWBlpKX+VosKleS1Aq6IcOAgmWUkQkaFwo/jcRpUJJvy6/WR7kDU37/oEMNLUtC30lV64dilhKVg8sdo5DxeLQlX0mqs1PbQYV8Qq3Uu90Bc3xJQJKYZ+U327kdREdyDuWTpJSfzMmoDo9pNBtxFG2hSvU0WTjowUhXVZfzmVyQoGBe9zZU3UZo5RGXaypBEYbhf24SvaEj617/7s2/UH1AF8AnLi2zsatnNTwwvrxv3CfryoonAVr43NQ2bv7GxaL9XAVyd7NqedpKVzN3gEQ9NT63pQPd2lPUDwrecbNsK5oHZ3vrBvzvasJbTaT4D8eH/TxoeZ0249KuyH84vExCWriOwfy+yDPb7C9t98aZ//zGkmvtTpXZNxrvRHktTDJJBOr7AT1+ujb9dmEobjFtpav7E15cC5dLasyW3rMwGs7PdN9+4tAU786Su9VEsR0OA5AKB1KQO5ouuQ56MoVW3Xs9osIGNdm1lhb4zXxiuZfTgs4Eu/pN896pE5e/qibAUddjT5ZMRhVM1FEDdj7wLgcjcYPIdX5rZ9GK6ywAHw+rbaeCU0sbVBlqIOtpCh0bU1yGMXOp45mfcdIDcOREuBjjAEDp4g61I4tx4WduleqiD4SmlZ9NnvAHgu1vbOoz4vGQzQ9o5BA0Ch9C+L/o87Pfv3Md7k3CXlI40JKGAO0s82S4Ake/yqCieajGoZdmzMbf1QqJ240rHZ6yGzcXVu4yMqw9J2bw2A0jx2kUwqWhWnOr986I9YgbQeEuz1ZZwbUEcu1XWwZ1QRlvbqWJ3+GQCeWgZyAl7J8u1dDuACAOScZKrO/ABTLgSKGwC6YqIt5Gc3DI1PXusBSJK8atc0bHSN2Wvb4nwQ7QzRz16rs7RvrGV8U9j4ugC50C3tFDbcg0DoR68dJefymwsRP5+oDNmBPGGBdr6b2ZmbdRYmWOc9Kbq/H/TZ/yV1Utg9zgm1feMt27etTv+vV7opo7XNquZcAb9UVjhX3wWxg0lIxTl+uY7w/b1DNpROLqVeQHVVWRhZldu7u/ksSu0Y6dfBIzeKVnc0tETnTjUgchYFqFRVRQntiIoote0b6uh+IzNZpnrJbOZaLbNrrF2J2zS6pVLuzlSegktTlDQth2dASETUue08pPKcfU1/7nZh99NWc630OI1TmROIGVL9dLt5v28X7xbhEpnMqw2n4RtH/HwbOkHVqTddSpYy4Kigo3ziKQe3fP0jAmXgBi+qOw/rM0NgpnX4EF8u57KmMlnmXDTdsaHhqPgcFUjE0DJ4wlCavvRkhLMpeqm7AxRmrz4pc+yvqP5Iu1ty+/WRH/4Gi9qJ49oRxfkkRJHin8537aVN8yknZkdVXIqM24mA/v7skt3m9PQlRPMXP0NYRkWttcSWotWu8wD9yfjNrxcpfT67F7QFGegnJQlyFyoMjuC1rYLXcbWmGMvBrtczsnoH9Fk/vbZDGX6G80YTG7hLYONLCNtq0qPzLyJN9KXjRMlzDT65VMU40odIW2PdHgtPjDtYKN0Sh7p8UWWau3IufxLk58lQclPzJdCHI6aCJDlFL0nGWmMZ0orm+nil8T5yUHKifVzC71JleUObCl1fPRWfLtfwPsemA5ENLo35GsvmOl3+isk/tytorObRIshC9gs49J5SMIXhJEYX7xCVpYxINkkQQGw3mYc38KFKy+aajzvlDP/dDohRmYtsYACEypybwuC8/z2rnBMDNEXBHwzeU8qaeCkLFUTqSvpuQw4qP7KbZTPNhW42hZEDtQAcF4peS6qzQEgW2CmSEyjRfUDnDlLE4g3cMXaenjDE03yQhaycyuNfag6IYIivFoppDFMOdWvt3HmScbDUgLab7louOUOuXvfQh6RsTZ3+bMVhByTCy18sHWStJim6Cb7t+LSgCRRNY0c/mEfqB5HIeSWjkUcjAjetskX9zFFPM3nWxHnT/57/Dzj0fqfCZcLZAAAAAElFTkSuQmCC", a1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAHeklEQVRYCV1XW2hcVRTd985MZjKxNaVa6cNqnwbaftSIiuiPilh8NC2tWh+lXyFFbMEKgvgABQUfIGoxWqGioFLjR0GQlqooGhptjNU+9EPaarT2IUySZt73Xtfa+5w7o3dyc885+5y91l57nzN3AnHXjoOPbJAgGEhEegNJugUNCURqzbrUk5ok6GcklK6OLrTRwc2PxPhLYkniCAswEqPtbXiWGxekEdUkxniQSCmReDSO4sGP+vYPERoQIjtGtr2JRQOB9tQ3Rh0DPMvNCnAi6cwUJROEBk4QvQluoCkBR6QR1UFgqkVYiWKufmRwT9+BrYFFLh/Dl7sSCAEN0PeEIgA044bkM3mNlkYFR9R8sq8qEIB9AMRRU6brUxiPNHol5whwfsK2yMYsZaeRYFzrwVM6GMuEoYRBBxxRZkgOQubEOeJCOFQHrl1uTEsEcKpDGwFjZ0sVC5KBLJb26kJkw0iADDPjCBHQR8n1BgRnKQknqToHIZCsRVWJoJgBeQJGUpXD3ITkEunN4n93GjXm+LaVAxGJadIyCq5ScOaRkVFIgpMQKoWSVxtlDBkZGHW+X6trdK6u6876PPsU0F+rzdwagDkkCPueEOGtr+BwPF2fNGKOnE8BSbZI2BrWTbaOSs2FHQwUFwzUni0YdRGj54dPFxX7nGVzGLXZKoi8qYWJPqNsA9X6cX3vm4Fka0ogp9ITnCBRxEi53smNZ7sz2ii1H0tirEHO682qI0pCppbVSosMx9vVRBHGUsE+78wWzaGqwJRiEe55nfPkmjnX6SICY5J8PX5AzpfPKohGipytWbROsmGWZp0zdnpEfj47iq4D5w6iAvyoShYUVgQ4YiLRVAQZBdK8AzyKIvlzelw2dW+WK2Yuome9rpy5WF75/llETZKR3L74bll/1f3eLGenT8ueI7uVIGX2kht4q88gQxYcG9VmGYBNnUyGXrqo2ZBdP+3E1qqlAMtm9cjNl6/Rw+ay4nxZu3xTaouw9tXh5+wQgl+Cp4cUI9fbpxYEfJW2y8IcKXMewHBwhhEdfz8FYWPd8vtkftdC6V+93aR31qFj78nRc2P/CcQK2MhYDaCt5BIJWZ0EzId5rWztY4ys/RaERvLlqX3y45lDKYlcJidP3Pi8LLy4lZpfzx+VDw7vgjIOQKNFmjTvLVAGS5/ECgkeJgG+6Zh/xxILtJpgCzDGYuS8d8bekMnaREqikC2kbW7Bl755CqSbEoSabdvRDIRE6Bt+VFn4sjawYZECvmQ8S/Y9EQPGInyPkvFktSS7Dr2WgrY33v1hp/w9OY61zjlJo4ipJH16EnySBGtMFcjzENIgwRIfLgiwgOAKrG0qgWrF3+Ez3+kWbAevN2sy9teIFN1W1mCcigyGvnxQJOjJkBh2bgagzAmJsvgYgZfMnvSFI0od9fVskkuKc9rxpSObl4FrH8O7QgZf2QyIcy16KzZ3BpCI+jaVVQGViOCMmEbIZiTIGo5oY8GgvWTWUlnbc6+O/f/f1fOvl1uX3ikdIMBvU42camqxEdj8+XEM6BwtQisIG9A0YDKJ8YiNQYj2HKLr730U7waZFPuXc0fSNhsPrt4qc7sW4FTt1DXMsx5Wqir90RdTwDYCxjiK0Bvw9G08qbgu0OgjuWfFFpk7Y0EKOD5xUp7et10OnvoqHctjVzx8w5OSxSefMRIE0mDgp1UHLEDe3IZkQpH5guBYKUP0yZ57evmsFXLLojtSIJ52r3/7Aux1eevgi7o7vHHJ7B5Zv2oLDqdc6/0R872SFqRhtilgcnh5aCAJFAW2aEGl54uKv/Ye+1B+++e4vjdM1Ery9sjL3qTPvpUPybLZK/UlNuGhxBTwo8q2lLYiZJQuN5zAYgO8Rs7FD6zql9nFS1OAP0onZM/h3Qoe4HzAmSPDJ76Q4ZOfp3NYJ9tuekby2JYF1gP9Akefrqb8jgv6P9tIRDUaAccwSvANWZOpyoQrSCuoAo7sPLYd1eFrCXeN5pkAmmcd1fcL3boYLVcnpR5XsYS+tbjUJzqsAZOG4HYrG2VcqV/AcvQ5B855LNci/EaIcdziYGKfKoAHLvpBm/N5saboE6CdObxrtOF4NWjHNvTA/mkHSLU5bUB0CBBGg7dzfdJG7fXEZBSwaTpABFMwh/WDC6A6B/bOnP2i8niMXmsAVEu6AxxbRtHAz7Ea3pL0Ql8dgoeXL4ICjUYFbkmOMXOOkSMRlR6RS2BBMWK+LeWwM/wpS3CsKVGBUVBRqQgQoF3B7zl1C1IwENkiJKDesf7mM5uzY1yjZ0qUNJ7wpWeAC66AoiRRrmNqiB1i+SCBLToUDPIeRw2VR5VROWF3zuAVTi2/F/DVzHGO8dYi1G1nwPY+YQQJyruYnQHfNoayHgx337V3CO4H6YhvtTW+2TICd3MRZfMONDrY2G9ilzSQKhajRqSOPSB9WFvzToLo82ceT0w4GBx+vDKkiqAnmz+5bcNUtTSQxM1enIDduih1QAUYNZWCU8SaAqJ3UcdMyI9KgTLMkNrcXKpC0owatVGCj1HUyeCn237Xn+f/Avavy/P8wtVMAAAAAElFTkSuQmCC", s1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAGCklEQVRYCYVXPY8cRRCtnt29s/EhW0KAEAkxmXUBIkBkRERwdoqFHNiW/AMwPwCJECTYEDKEnYJk4+ASIwQ6WSIjwJKNQBjO8t6Xb3dvZ5r3XlXPjIzX7rub7qmuqvfqo3v3ksXIH53fsJQvmOV1y3aqyJ8055x74sZyAys8EqS+hX2pcC9b3t6xPD/i/gSPrWxpvPrNjWt0QhvLV85/CU2AP3sQXEDmwEIiXkuKLw4sb5DnBgz/nWju9NL42Lc3LyZFbs3VZ0O7RusATrnmj0ceURMMg3JfYEVC+4dme4ctUe5Xls4MlfbQdYvHnnQ4m4N9KKVkmYiDyqzCX+C6VYArG65PcI3jq5Z3D7QsQYDEhSE8rLvGkudRbfZwDzwZSZAo69WR2ck1EAlbYLU6EAmcMrIk8dHAjP60R3+2XmHvqQ1XlBuC8ifA4Q+ZObL8cBcLuGGz4afoQ63LGl+wn4aM131I0fIpSJ42oNws6KmtMyEEVRzNa8vTmVUrgyBHfwhbme+DwY6s3YF7gY+lBErtqM9RIpQ8hCUbNkePDFHjICp96DBJjNgnMKoSEiFmkvHxRAKljllHDdGfPWeDd8+0RssWeTbFmf/b6p82rdn8TuDMVhKZx7LBkoBhaR/5FDAYo10QMY5O3VgNxoXQMuAiT6vHrHr1NRu9f85GF68QGqWAPQJp2CN1NKCOqhP6XwZ0aZAAvCpbWLAB0b/taHYnciwBw1AoONUnnsdSibfB66dt8cbb1vx40xKzTjHLESWhLUsmAoxQ+2DmelQEa8gpqXjme2Pn40uWD3CrjnAMkV8RxX56bs1OfHDZVk6/Ke3hW+/Y9NYPOsIJfhrcJ06A0bvD1rNH3kPhkjwGoLQCoP7ApZJWcIeJrQensu3v2v7Xn7Wa1YuvWLPAKSEYH0cLTA7u5UYPtHWRGSJGOK5EdNaMNaSH/tA1ipgSSoM/MEEBRCjv7VhzsOfKo5Wwhd99NGiEzblk2nuATUFmBBJWmXHBoBFd1hEgGOOuAMwf/ja4L3hbVmtrVqEXOOr7f8q0gY90iM+CdngW6HjoeHp2QCwqu5YdHKxbWy38pCR8KPiJAYfB0KqXXrbjGx+2qvOtW/CJXto9tLRoeA20/tyvLiIHLxdPP1rGKVbBr3g++elXZbl0rrfv2+x7fOTvPrJqhtuU4KHdD2qo1DPKsqvLhykqvcAz1G4uBexvzH/9xfa++MTyPw+swtnnFayysczhqs1Ax4ZpB1TR6Hnswy/u/W6HiEwnAGWKFpBdgzov7t2x+u5ddPxR15xQA7TK1XMrG2SgE1GJgyTaDOAY0VkZ9YNtm25e14VT0XGDCNnEPG6oM4n51VuuWQBTCJ+8V9Q1ESTXOAVINSPhoMPY1CvXIoAalkGwR1O9hTvZUVChy0icgH5SQEbY1ORgy/pwHJ4C+HNWWGBQsdGxxCLI9DhRRTo8+z4IFsThvUp4Q0CciOZazChe9FUqdMN6qGMUtHQSxIMGodEu/J0OSdhnX+s6jjRTKzETEWubXVhQ1hGCInwPWRfX7ZWCXiR3Im5EIQbUieWXkIv4ZN0LZ+nrhZBcADxwhNeZoQek6OmXPIBdB67guf7rD5vf/lmixZ3fPAr2Db+UoocIXgaBCihTTncdtaIIDd+wNL981lUk6BQadXe2xXRuNb731XErVgBNAGfDMQuBIIziVJBsLrgrMp/df5FxH1dxVxdFQSLBjjPTqT+ACZDvWFOmjpfPSLFkFEiIp8/+HutuW/b0OSmMSsNo1tEEKCJlivmFpCIhrKt+zltQEnIQzvKh1y7dkjMzpObBTfBxl7dEVMa8fl2BEYo5P8kierJl1RU/HQDAQQsIEZ0ErQuQXIe4aIiMpS1WdOyKYYLInSkB4mZzNnINDkSNElBXOP7AmpEX+5IFN4GcWQ0dylLK42r4+dVriHBs0XSQx5CKrwXooCFwYL3AMeYCGiJXgwvulqwK3bWZxvELN25fI4rG7NJ7G/jywf+Q13Ou9d+SosHnQDPZb69rAtFIgHSmX1JwmfaYBRdQypX0sTfB2xayKHDK/wNolX2UI+Wo7QAAAABJRU5ErkJggg==", go = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAGLUlEQVRYCW1XTY9UVRCt19M9MwyiAxojRI1REImJRAfQhcSVGmJINMG9G5LRH+DOxJ0JP0BnpYlbMCYqGBciJmqIZiAsSARUUDQoYGjmo2emP97znFNVr3vUm+n76ladqjpV9973oLAYcyf6hwZlOVtVNmNWTVcQDH9lPLnGcr1Oa9cTRoD8KEoerstS3m1g5pe71dw7h6eP0b3g9O7x7ntwnKUsR4AzoQIymGzUU/DAFDlS53Il0qlTnABSJpHOGnzKau7IG1teL7zywVE6OJjoQnIGB1gEmEk4JQ0yAqWvP9PPn8DV/obkpQ1K4pClarzaZNs9OuEcnlyVY1UBzDEk586upUF/9ZJCFkM5Wi9df1B58iRkg9kmwDNKFoFSromMZmBzMPRYR4w6D+BEA5d4PJHTVteEkr/jihkQKKcVFEwC7wePieg10pG0J5BrVsuhp+SR7ZO/GStfQXKC3IczcDjszdpZQQiihlgXSu5BqKXhxDWDSRHY/9Ex/1qvtH5fIT00fWpsZc0S7KTjlEMALGSIR9hFbAQ7gD8H9byyVVVgnyskxY+x0y+6kddaPpianS69PcmGcQ9UHzw3iQcdkhDFPFxsrcf2ZNhSkTEQ4chO1nLk8u0FgayITFOJ7amvTlbAUlLO5PLRNPLCUtqiPkfJ3rsjY52Hrs2sHuFlzRZxlQmFcXOty+SRX77ug7nGupBFEkQ5zJKbXGTlmXy8ZfbwVp3PCJbtrez6rYHduxm84fjz731bXoGAxe5HWtr728ulbb6jIUI5sWM9HMRzP63VuZI43wNiNMpy01RhLz09kf7rnp9+t2J7do7b1rvHbP5C1z76umP7do3by/un7OT8ij32YMtmdv7Xd7FT2rlLIMBo4kypwBmI0yklbdAvLFV2/PSq5AP7JmxsrLCvzq4Zg1y93reb7YG9dmCjPbmjZafPN+z5PZN2a3FgX55ZtW1bxuzCr13b8UDL9u6atD9u9O3UmRXr4lZkh1UscnGNLXAm2ps4uWs9s/NXBqL64l4QgHTxas/+XvDXX3uxtLOXevbUo+N2+OAmG28VdvTzRet2K7v8Z99+uVbZxHgBAmbtpdJ++JFfH4XD5KKvK2uocnSh0tF3q5PxL5c8wond4X4y1klUxXvO5Feu9ez85R46Bgv/COCPI3R8oaW/Y/xcNWpsbIWS00/ew0lBY8lte+i+pjWxNRzb7mnaXTg3HCLBp1Y+1cRCqyIC0BDBTB6OTKDfaBTaAKa+iQvywt4NuAGlXfitqy4cfHZK4enivu6stdjzGxHvi4hFIg2COTJ4rl0nkybZASV6/xOTdufGhrbh41PL2ord2yds+zZcz4g39GRsj18zDCNj6sIqOJR8cngy7pGvQ6n1lk0Ne+bxCfsL74MzF7t2Ewfzm3Orgrzy3EYrsBN52t1P80jMOEcKzWuIJEoUCrYlB/Wf4d4z6GIHOBhaOHSffNuxazd6/j2A8ovvO7pu9JvCK2CxY9iann14YsFuLQ08OWxej8fPPMVb7y9Iw9ZNTfo+8YPCl0SCRBLp64aIpH/3l/Bu4A0qS7+iDJbb4P6O80JhHLEzXvx7wFkNQXCKTnhyuqENwcAZx+cXFrWcJGjHj3aHZnL6pw7PkBm76Szp6AB3pByB5Ip1EsKTATTok2v5cwoTA6UOqnXdFMavLTrgrfWlV5nJGYryuqAef0hIoBoiaJJ1/3BAhxRXb1vkxJZx6/xjFExjG+EBMEP9K7nI0FZXTfL8ZXCW5qW4PgqAVqE4YYx2Qy8iad2mgOTGEXjpXB5JBMjwuolu+DipoT99kojLDnRdA1esTUZM6RX6s24jnWFXQ4gbxbJy+KkiCIpDaMh08k5QiT/4JibIt/EmtPkaSBKkpwkPRNJHRCpXpt3JMoHDk3ztzK2iDVONYWwO6fEoivkGPmhzDgybql3PXD5wykoVFEpWUXeHQairq/QYo8Xw4HGt6oEtkLtxZBb/SxWJCAaDQmmKKpJU2JTL80HjeOpEUBrows6Htg2C5HSwau6Dt+8/5kcWyjfn2oemWgP8D7kxMygH00QziLd25E3HKBiqHvIy3oTkJ10IddsVIBK73AZ0vrBCyenzD7OyHHaTkJSSAAAAAElFTkSuQmCC", l1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAGkElEQVRYCZVXS2udRRh+Z+Y7zTFtk5iml7S1XpBW3HhJdVER0YUKikhtRNCFF5TYheLWjX/AlRuzcOnO/AXXIpiFG0URoUWq0KJpLb2eb8bned6ZcxLaCP1O5szMe33ey8z5Eqw+5czyKSt5Bdsli3vnRB6dB+k6lgV/2SVLsYJ1IE108pw23jf6plk6pWyEYOuhhNXwyPdrNBj4Vc689qXlQudm3QGoJS2t9GbX/8B6hOEgCpzROeexQ4EjHRTSsZ/IEXjjYV31ILuaHl3/MHjk/TdEaHEPxvTYkBzlq2Y3zrkzOWD0XNBJM+h7OmqOmyPOkmsgMvRDDaDYcoShFQqFMJRz2a4oIYbtFOgzQq40ykmLUNL0zoVkVJrmtM4OGNbgXCAzs0SdvBLxtUTDJd1dIyPD0+xC2HezKFa0QKXxqBmAtNEwsyFwVR9eW5kcOAWd53KSX4pANRfibjA7qgMEnXiEboB6oIYZ8R0A00iDeOi4OQM4lY00Aa3louaY5mup5zIXA1WQYndMJlHSMI1x8shCYhlEqWwH6ptJXb0Hqh6BKTuTyEGRXdqn7a6EnbCBVqiIZZBfAjJRFKw0a2V0ofJcxh1WueGDFhc/RtvcZ+HKT5bPfV5PEfjVXusDZQBgOjUYFkSmR7ItddUJJqWWWRj9gx2OpTLjdOmCF+//wkLnV4jNPm1xeK/1Py+jd27QEP5q9DLrPtBZ6MPKbChZ32JMPUd1rgzBCPulloV8zxzoO5+YOJcW9KaOmO1+EjtPdyvn5pm5B5+jatE4hqoNWpATp8EM+mWXDMpoPVa+ZpS3PgH3inULEJnUXmv6Aw3h07l2mDxiORKtRegArFu0MjyGXpweN1cDGP79zsqNP7cgKFd+Mbv2O474rLJD+5ujp++uaZChk1AJbhhQMq5jgCmocTr8KUpwl+WzV61c/FZZyrhUvD+GuNI/s7BwysKOQ1au/WblwtrYoXV7LfTXcLtfZujj0bErme7mvNWUWfBaUzxb3PeuhcT7ArIHTlu+hIjzZb+cEk4SLjLrL1r56ysWzUEBuHe727DBfrQNrvZ8E1Y8814CbPSppWjN5bTeytRRi7sel3N+xanDFuZfrWWAicE+2GuAGRBLWTPK7OkukCb6ASAkWwGo2SRMAUfejJUesUA5LbxB5pYnLryOfbIyWJA4v5Q90FgW+sjQLfhFVXZrf/HHjld76wdlwDveETnD1wSk6KePbnHOTZxaNNtzEg05lKPMIA68b/HY1xbnXxTNywobygiUiIo2cSpCGKg8AtDq3hQQNl4PMNCAac8r9HfbJy2chBxKhBH3v2Np/gVcKwNLix9Y2H3CecyCDhe/HEzARVMGe5WFSOfNMaPPPVFSFgqoV9z1mO9v852QmTL1gIWZpwD05S0S3eGPoI9jiw9tFf4EMxPVfEi4T9DUuoi8duRUMIicYOL880hV6+Mt9sebwf43bXDo9HjfFiENLR35pDomDHwULPGwN1CyHQhQkFgbDU5g6tNZmn2m2dt27maO43jyB+3WJ+18GC9ZL7kzOpSIl4L+GK5fxUI3YbCucebEtoZvdbU9pTv4tmVcYq2nVIoGBnHXDPAi4rHBrRdYJ9zRc89tb/UOOMxOd/A9aHhe+T6oNTMOmpqQDjWUCQji7k7TD92Bm/8XTeilsuMgfKC8uFvgRs656ASoOm73QRldsv7SDxaG90DQz8ikFblqg4aIna/tfJw+6dsql684T3XHEgBcBl0w+vUtvWixRkKI+rMU/egm5lE957xKUB798NChQnBL1OOzmcaoMhoM/nmKYoy4H/HyVyLWLi4A0MGbKH8YIKgLhYrsVl6faETPFZigwU+gRUWhN0kH4imEBYJinWkLkYHOtTsmSOjw5cfFuIU+3gnj9bMb6Po5Jlo/GrwsACJiUDoydtRtQIN0LjpYtERjmimLlcCTyHPODtcLBznIBkBRBU5rHORvENI6BciQIISYnqj3ZUaDCw1rvLspmoQoEgT4z1uCnA9Pd4IcR4QMdSjHwLCUHdpX6jETJIjrAFZWBZdMDAFhrZlGiFGZhqIG1jLMmUB0jjXzzabTnv9ZMnK3x5rTTguyZZq0kPNq5H+psA0QkgFCjwaT0FJwclVj0wSZ47bGTOBbmhNcOVYw7CsPSCo0A5/ds3+vSYb78uPxU31/cwUAlnLf490aDqqThppyPClthltlajyD54C9nNKvNggQvA3Q1lFOOD+/Rjv/AYfYvIrlGomFAAAAAElFTkSuQmCC", kn = /* @__PURE__ */ Y({
  name: "FChatAttachmentPreview",
  props: i1,
  emits: [],
  setup(e) {
    function t(o) {
      switch (o.toLowerCase()) {
        case "doc":
        case "docx":
          return o1;
        case "xlsx":
        case "xls":
          return a1;
        case "ppt":
        case "mobi":
          return s1;
        case "txt":
          return go;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
          return l1;
        default:
          return go;
      }
    }
    function u(o) {
      return o.icon ? o.icon : t(o.type || "");
    }
    function r(o) {
      if (o === 0) return "0 B";
      const a = 1024, s = ["B", "KB", "MB", "GB"], c = Math.floor(Math.log(o) / Math.log(a));
      return parseFloat((o / Math.pow(a, c)).toFixed(2)) + " " + s[c];
    }
    function i(o, a) {
      const s = r(o.size || 0), c = u(o);
      return h("div", {
        key: a,
        class: "f-chat-attachment-preview-card",
        role: "button",
        tabindex: 0,
        onClick: () => n(o),
        onKeydown: (f) => f.key === "Enter" && n(o)
      }, [h("div", {
        class: "f-chat-attachment-preview-icon-wrapper"
      }, [h("img", {
        src: c,
        alt: ""
      }, null)]), h("div", {
        class: "f-chat-attachment-preview-info"
      }, [h("div", {
        class: "f-chat-attachment-preview-name",
        title: o.name
      }, [o.name]), h("div", {
        class: "f-chat-attachment-preview-meta"
      }, [s && h("span", null, [s])])])]);
    }
    function n(o) {
      o.url;
    }
    return () => {
      const o = e.content;
      if (!o) return null;
      const {
        message: a,
        attachments: s
      } = o;
      return h("div", {
        class: "f-chat-attachment-preview"
      }, [a && h("div", {
        class: "f-chat-attachment-preview-message"
      }, [a]), h("div", {
        class: "f-chat-attachment-preview-list"
      }, [s.map((c, f) => i(c, f))])]);
    };
  }
});
kn.install = (e) => {
  e.component(kn.name, kn);
};
const ya = /* @__PURE__ */ Y({
  name: "FXAgentThinkingMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    return () => {
      const t = e.content, u = t.streamStatus === "end" || t.streamStatus === void 0;
      return h("details", {
        class: "f-ec-thinking",
        open: !0
      }, [h("summary", {
        class: "f-ec-thinking-summary"
      }, [Ae("思考过程"), u ? null : h("span", {
        class: "f-ec-thinking-badge"
      }, [Ae("进行中")])]), h("div", {
        class: "f-ec-thinking-body"
      }, [t.text]), t.sources && t.sources.length > 0 ? h("ul", {
        class: "f-ec-thinking-sources"
      }, [t.sources.map((r, i) => h("li", {
        key: i
      }, [r]))]) : null]);
    };
  }
});
function c1(e) {
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
const f1 = /* @__PURE__ */ Y({
  name: "FXAttachmentFileMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    const t = N(() => {
      const u = e.content.media;
      return u.startsWith("http://") || u.startsWith("https://") ? u : `#attachment:${encodeURIComponent(u)}`;
    });
    return () => h("a", {
      class: "f-ec-attach",
      href: t.value,
      target: "_blank",
      rel: "noopener noreferrer"
    }, [h("span", {
      class: "f-ec-attach-icon",
      "aria-hidden": !0
    }, [Ae("📎")]), h("span", {
      class: "f-ec-attach-body"
    }, [h("span", {
      class: "f-ec-attach-name"
    }, [e.content.name]), h("span", {
      class: "f-ec-attach-meta"
    }, [h("span", {
      class: "f-ec-attach-cat"
    }, [e.content.category]), h("span", {
      class: "f-ec-attach-size"
    }, [c1(e.content.size)])])])]);
  }
}), d1 = {
  0: "高",
  1: "中",
  2: "低"
}, h1 = /* @__PURE__ */ Y({
  name: "ErrorReminderMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    return () => {
      const t = e.content.errorLevel;
      return h("div", {
        class: ["f-ec-error", `f-ec-error--lvl-${t}`]
      }, [h("div", {
        class: "f-ec-error-head"
      }, [h("span", {
        class: "f-ec-error-badge"
      }, [d1[t]]), h("span", {
        class: "f-ec-error-label"
      }, [Ae("错误提醒")])]), h("div", {
        class: "f-ec-error-text"
      }, [e.content.errorText]), e.content.errorLink ? h("a", {
        class: "f-ec-error-link",
        href: e.content.errorLink,
        target: "_blank",
        rel: "noopener noreferrer"
      }, [Ae("查看详情")]) : null]);
    };
  }
}), p1 = /* @__PURE__ */ Y({
  name: "InputRecommendMessage",
  props: {
    content: {
      type: Object,
      required: !0
    },
    onPick: {
      type: Function,
      default: void 0
    }
  },
  setup(e) {
    const t = (u) => {
      var r;
      (r = e.onPick) == null || r.call(e, u), console.info("[InputRecommend] pick:", u);
    };
    return () => h("div", {
      class: "f-ec-recommend"
    }, [e.content.title ? h("div", {
      class: "f-ec-recommend-title"
    }, [e.content.title]) : null, h("div", {
      class: "f-ec-recommend-chips"
    }, [e.content.suggestions.map((u, r) => h("button", {
      key: r,
      type: "button",
      class: "f-ec-recommend-chip",
      onClick: () => t(u)
    }, [u]))])]);
  }
}), m1 = /* @__PURE__ */ Y({
  name: "LinkCardMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    return () => {
      const t = e.content;
      return h("div", {
        class: "f-ec-linkcard"
      }, [t.poster ? h("div", {
        class: "f-ec-linkcard-poster"
      }, [h("img", {
        src: t.poster,
        alt: ""
      }, null)]) : null, h("div", {
        class: "f-ec-linkcard-body"
      }, [h("a", {
        class: "f-ec-linkcard-title",
        href: t.url,
        target: "_blank",
        rel: "noopener noreferrer"
      }, [t.title]), t.subtitle ? h("div", {
        class: "f-ec-linkcard-sub"
      }, [t.subtitle]) : null, t.relatedLinks && t.relatedLinks.length > 0 ? h("div", {
        class: "f-ec-linkcard-related"
      }, [h("div", {
        class: "f-ec-linkcard-related-label"
      }, [Ae("相关阅读")]), h("ul", null, [t.relatedLinks.map((u, r) => h("li", {
        key: r
      }, [h("a", {
        href: u.url,
        target: "_blank",
        rel: "noopener noreferrer"
      }, [u.title])]))])]) : null])]);
    };
  }
}), g1 = /* @__PURE__ */ Y({
  name: "ReferenceSourcesMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    return () => h("div", {
      class: "f-ec-sources"
    }, [h("div", {
      class: "f-ec-sources-title"
    }, [Ae("引用来源")]), h("ul", {
      class: "f-ec-sources-list"
    }, [e.content.items.map((t, u) => h("li", {
      key: u
    }, [h("a", {
      href: t.url,
      target: "_blank",
      rel: "noopener noreferrer"
    }, [t.title])]))])]);
  }
}), b1 = /* @__PURE__ */ Y({
  name: "UnknownEnterpriseMessage",
  props: {
    content: {
      type: Object,
      required: !0
    }
  },
  setup(e) {
    return () => h("div", {
      class: "f-ec-unknown"
    }, [h("div", {
      class: "f-ec-unknown-title"
    }, [Ae("未知类型消息")]), e.content.wireType ? h("div", {
      class: "f-ec-unknown-wire"
    }, [Ae("wire type: "), e.content.wireType]) : null, h("div", {
      class: "f-ec-unknown-desc"
    }, [e.content.hint ?? "客户端无法识别此消息类型，已按占位展示。"])]);
  }
}), v1 = [
  ya,
  f1,
  h1,
  p1,
  m1,
  g1,
  b1,
  Jo
];
ya.install = (e) => {
  for (const t of v1)
    e.component(t.name, t);
};
const C1 = {
  install(e) {
    e.use(Cu).use(on).use(an).use(pn).use(mn).use(gn).use(bn).use(vn).use(_u).use(wu).use(Eu).use(Jt).use(xn).use(yn).use(An).use(kn);
  }
};
export {
  ya as FXAgentThinking,
  Cu as FXAppPreview,
  f1 as FXAttachmentFile,
  kn as FXAttachmentPreview,
  on as FXBubble,
  Pi as FXBubbleAction,
  an as FXCarousel,
  yr as FXCarouselItem,
  pn as FXChatPreview,
  mn as FXCoding,
  h1 as FXErrorReminder,
  gn as FXFileOperation,
  bn as FXGenerateProcess,
  vn as FXHistory,
  p1 as FXInputRecommend,
  m1 as FXLinkCard,
  _u as FXMarkdown,
  wu as FXMarkdownPreview,
  Ir as FXPrompt,
  Eu as FXPrompts,
  g1 as FXReferenceSources,
  Jt as FXStartedTodo,
  xn as FXSuggestion,
  yn as FXTodo,
  pr as FXTodoListItemView,
  _n as FXTodoListView,
  b1 as FXUnknownEnterprise,
  Jo as FXUserAuth,
  An as FXWelcome,
  Oa as appPreviewMessageProps,
  i1 as attachmentPreviewProps,
  m0 as bubbleActionProps,
  Ma as bubbleProps,
  b0 as carouselItemProps,
  g0 as carouselProps,
  Kd as chatHistoryProps,
  x0 as chatPreviewProps,
  Gd as codingMessageProps,
  C1 as default,
  Vd as fileOperationMessageProps,
  Yd as generateProcessProps,
  De as getCustomClass,
  Te as getCustomStyle,
  Ra as isImageUrl,
  d0 as markdownMessageProps,
  y0 as markdownPreviewProps,
  t1 as promptProps,
  e1 as promptsProps,
  Rr as renderIconNode,
  un as renderNode,
  Ja as startedTodoProps,
  u1 as suggestionProps,
  ts as todoListItemProps,
  es as todoListViewProps,
  n1 as todoProps,
  Br as useStreamingOutput,
  r1 as welcomeProps
};
