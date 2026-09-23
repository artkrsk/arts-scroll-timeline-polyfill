/*! scroll-timeline-polyfill 1.1.0 (flackr/scroll-timeline) - Arts-patched, vendored by arts/scroll-timeline-polyfill. Deviations from upstream: (1) per-stylesheet transpile errors are non-fatal (upstream aborts the WHOLE init when one hostile selector throws - observed 'Empty selector' from a third-party inline style killing every animation); (2) <link data-aphrodite> opts a stylesheet out of transpiling (upstream honors the attribute on inline <style> only) - pair with the arts/scroll_timeline_polyfill/skipped_styles filter; (3) whole body wrapped in a native-support guard (belt - the loader.js gate is the primary; safe if this file is ever loaded directly) - the guard tests the NAMED timeline syntax alongside the anonymous functions, so a browser implementing only part of the feature cannot be misread as fully native and skip the polyfill its consumers need; (4) source-measurement entry (Ie) bails on missing/detached sources - upstream throws 'getComputedStyle: Argument 1 is not an object' when AJAX page swaps detach a timeline source between observer registration and callback. (5) fromCssNumberish guards a zero rangeDuration - a range whose start and end resolve to the same point (e.g. a view-timeline subject exactly as tall as its scrollport, so the contain range is zero-length) divided by zero and threw 'Animation.currentTime setter: Value being assigned is not a finite floating-point value' on EVERY tick; its counterpart toCssNumberish already guarded the same divisor. (6) the skipped-stylesheet console.warn from (1) is silent - it fires on every Elementor page (their inline CSS trips the parser) and there is nothing a site owner can do about it. (7) stylesheets containing NO timeline syntax are left untouched (link + inline paths) - the transpiler re-serializes any sheet it touches, so the upstream "output differs" gate blob-swaps essentially every <link>; an AJAX navigation that re-inserts the page stylesheets then detached ~8 sheets for a couple of frames (unstyled-header reflow flash, once per hard load). Content is now checked before any transpile or swap. (8) CSS scroll bindings bootstrap auto/omitted durations, split balanced lists and resolve live subject inset variables; (9) stylesheet text replacement replaces owned registrations in DOM order and refreshes existing proxies without duplicate wrappers. */
if(!(CSS.supports("animation-timeline: view()")&&CSS.supports("animation-timeline: scroll(root block)")&&CSS.supports("view-timeline: --probe block")&&CSS.supports("animation-timeline: --probe")&&CSS.supports("animation-range: contain 0% contain 100%"))){
var __defProp=Object.defineProperty,__defNormalProp=(e,t,n)=>t in e?__defProp(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,__publicField=(e,t,n)=>(__defNormalProp(e,"symbol"!=typeof t?t+"":t,n),n);!function(){"use strict";class e{}class t extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class n extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class i extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class r extends e{constructor(e,t="unrestricted"){super(),__publicField(this,"type"),__publicField(this,"value"),this.value=e,this.type=t}}class o extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class s extends e{}class a extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class l extends e{}class c extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class u extends e{constructor(e,t="integer"){super(),__publicField(this,"value"),__publicField(this,"type"),this.value=e,this.type=t}}class m extends e{constructor(e){super(),__publicField(this,"value"),this.value=e}}class f extends e{constructor(e,t,n){super(),__publicField(this,"value"),__publicField(this,"type"),__publicField(this,"unit"),this.value=e,this.type=t,this.unit=n}}class h extends e{}class p extends e{}class d extends e{}class S extends e{}class g extends e{}class v extends e{}class T extends e{}class y extends e{}class w extends e{}class x extends e{}class b extends e{}class C extends e{}class E{constructor(e){__publicField(this,"input"),__publicField(this,"index",0),this.input=e}consume(){const e=this.input.codePointAt(this.index);return void 0!==e&&(this.index+=String.fromCodePoint(e).length),e}reconsume(e){void 0!==e&&(this.index-=String.fromCodePoint(e).length)}peek(){const e=[];let t=this.index;for(let n=0;n<3&&t<this.input.length;n++){const n=this.input.codePointAt(t);e.push(n),t+=String.fromCodePoint(n).length}return e}}function k(e){return 10===e}function M(e){return k(e)||8192===e||32===e}function P(e){return e>=48&&e<=57}function I(e){return P(e)||e>=65&&e<=70||e>=97&&e<=102}function R(e){return function(e){return function(e){return e>=65&&e<=90}(e)||function(e){return e>=97&&e<=122}(e)}(e)||function(e){return e>=128}(e)||95===e}function N(e){return R(e)||P(e)||45===e}function A(e){return e>=0&&e<=8||11===e||e>=14&&e<=31||127===e}function V(e,t){return 92===e&&!k(t)}function _(e,t,n){return 45===e?R(t)||45===t||V(t,n):!!R(e)||92===e&&V(e,t)}function L(e,t,n){return 43===e||45===e?P(t)||46===t&&P(n):P(46===e?t:e)}function O(e){const t=e.consume();if(I(t)){let n=[t];for(;I(...e.peek())&&n.length<5;)n.push(e.consume());M(...e.peek())&&e.consume();const i=parseInt(String.fromCodePoint(...n),16);return 0===i||i>1114111?65533:i}return void 0===t?65533:t}function U(e,t){const n=new o("");for(;;){const i=e.consume();if(i===t)return n;if(void 0===i)return n;if(10===i)return e.reconsume(i),new s;if(92===i){const t=e.peek()[0];void 0===t||(k(t)?e.consume():n.value+=String.fromCodePoint(O(e)))}else n.value+=String.fromCodePoint(i)}}function j(e){let t="";for(;;){const n=e.consume();if(N(n))t+=String.fromCodePoint(n);else{if(!V(...e.peek()))return e.reconsume(n),t;t+=String.fromCodePoint(O(e))}}}function W(e){let t=function(e){let t="integer",n="";for([43,45].includes(e.peek()[0])&&(n+=String.fromCodePoint(e.consume()));P(...e.peek());)n+=String.fromCodePoint(e.consume());if(46===e.peek()[0]&&P(e.peek()[1]))for(n+=String.fromCodePoint(e.consume(),e.consume()),t="number";P(...e.peek());)n+=String.fromCodePoint(e.consume());return[69,101].includes(e.peek()[0])&&([45,43].includes(e.peek()[1])&&P(e.peek()[2])?(n+=String.fromCodePoint(e.consume(),e.consume(),e.consume()),t="number"):P(e.peek()[1])&&(n+=String.fromCodePoint(e.consume(),e.consume()),t="number")),{value:parseFloat(n),type:t}}(e);return _(...e.peek())?new f(t.value,t.type,j(e)):37===e.peek()[0]?(e.consume(),new m(t.value)):new u(t.value,t.type)}function F(e){for(;;){const t=e.consume();if(41===t||void 0===t)return;V(...e.peek())&&O(e)}}function D(e){const i=j(e);if(i.match(/url/i)&&40===e.peek()[0]){for(e.consume();M(e.peek()[0])&&M(e.peek()[1]);)e.consume();return[34,39].includes(e.peek()[0])||M(e.peek()[0])&&[34,39].includes(e.peek()[1])?new n(i):function(e){const t=new a("");for(;M(...e.peek());)e.consume();for(;;){const n=e.consume();if(41===n)return t;if(void 0===n)return t;if(M(n)){for(;M(...e.peek());)e.consume();return 41===e.peek()[0]||void 0===e.peek()[0]?(e.consume(),t):(F(e),new l)}if([34,39,40].includes(n)||A(n))return F(e),new l;if(92===n){if(!V(...e.peek()))return F(e),new l;t.value+=O(e)}else t.value+=String.fromCodePoint(n)}}(e)}return 40===e.peek()[0]?(e.consume(),new n(i)):new t(i)}function z(e){const t=e.consume(),n=e.peek();if(M(t)){for(;M(...e.peek());)e.consume();return new h}if(34===t)return U(e,t);if(35===t){if(N(n[0])||V(...n)){const t=new r;return _(...n)&&(t.type="id"),t.value=j(e),t}return new c(String.fromCodePoint(t))}return 39===t?U(e,t):40===t?new w:41===t?new x:43===t?L(...n)?(e.reconsume(t),W(e)):new c(String.fromCodePoint(t)):44===t?new v:45===t?L(...e.peek())?(e.reconsume(t),W(e)):45===e.peek()[0]&&62===e.peek()[1]?(e.consume(),e.consume(),new d):_(...e.peek())?(e.reconsume(t),D(e)):new c(String.fromCodePoint(t)):46===t?L(...e.peek())?(e.reconsume(t),W(e)):new c(String.fromCodePoint(t)):58===t?new S:59===t?new g:60===t?33===n[0]&&45===n[1]&&45===n[2]?(e.consume(),e.consume(),e.consume(),new p):new c(String.fromCodePoint(t)):64===t?_(...n)?new i(j(e)):new c(String.fromCodePoint(t)):91===t?new T:92===t?V(...n)?(e.reconsume(t),D(e)):new c(String.fromCodePoint(t)):93===t?new y:123===t?new b:125===t?new C:P(t)?(e.reconsume(t),W(e)):R(t)?(e.reconsume(t),D(e)):void 0===t?void 0:new c(String.fromCodePoint(t))}const H=new Set(["px","deg","s","hz","dppx","number","fr"]);function $(e){return H.has(e.toLowerCase())}function q(e,t){if(["x","y"].includes(e))return e;if(!t)throw new Error("To determine the normalized axis the computedStyle of the source is required.");const n="horizontal-tb"==t.writingMode;if("block"===e)e=n?"y":"x";else{if("inline"!==e)throw new TypeError(`Invalid axis “${e}”`);e=n?"x":"y"}return e}function B(e){return artsSplitCSS(e," ")}function K(e,t){return e.reduce(((e,n)=>(e.has(n[t])?e.get(n[t]).push(n):e.set(n[t],[n]),e)),new Map)}function G(e,t){const n=[],i=[];for(const r of e)t(r)?n.push(r):i.push(r);return[n,i]}function Q(e,t={}){function n(e){return Array.from(e).map((e=>Q(e,t)))}if(e instanceof CSSUnitValue){if("percent"===e.unit&&t.percentageReference){const n=e.value/100*t.percentageReference.value,i=t.percentageReference.unit;return new CSSUnitValue(n,i)}const n=e.toSum();if(n&&1===n.values.length&&(e=n.values[0]),e instanceof CSSUnitValue&&"em"===e.unit&&t.fontSize&&(e=new CSSUnitValue(e.value*t.fontSize.value,t.fontSize.unit)),e instanceof CSSKeywordValue){if("e"===e.value)return new CSSUnitValue(Math.E,"number");if("pi"===e.value)return new CSSUnitValue(Math.PI,"number")}return e}if(!e.operator)return e;switch(e.operator){case"sum":e=new CSSMathSum(...n(e.values));break;case"product":e=new CSSMathProduct(...n(e.values));break;case"negate":e=new CSSMathNegate(Q(e.value,t));break;case"clamp":e=new CSSMathClamp(Q(e.lower,t),Q(e.value,t),Q(e.upper,t));break;case"invert":e=new CSSMathInvert(Q(e.value,t));break;case"min":e=new CSSMathMin(...n(e.values));break;case"max":e=new CSSMathMax(...n(e.values))}if(e instanceof CSSMathMin||e instanceof CSSMathMax){const t=Array.from(e.values);if(t.every((e=>e instanceof CSSUnitValue&&"percent"!==e.unit&&$(e.unit)&&e.unit===t[0].unit))){const n=Math[e.operator].apply(Math,t.map((({value:e})=>e)));return new CSSUnitValue(n,t[0].unit)}}if(e instanceof CSSMathMin||e instanceof CSSMathMax){const t=Array.from(e.values),[n,i]=G(t,(e=>e instanceof CSSUnitValue&&"percent"!==e.unit)),r=Array.from(K(n,"unit").values());if(r.some((e=>e.length>0))){const t=r.map((t=>{const n=Math[e.operator].apply(Math,t.map((({value:e})=>e)));return new CSSUnitValue(n,t[0].unit)}));e=e instanceof CSSMathMin?new CSSMathMin(...t,...i):new CSSMathMax(...t,...i)}return 1===t.length?t[0]:e}if(e instanceof CSSMathNegate)return e.value instanceof CSSUnitValue?new CSSUnitValue(0-e.value.value,e.value.unit):e.value instanceof CSSMathNegate?e.value.value:e;if(e instanceof CSSMathInvert)return e.value instanceof CSSMathInvert?e.value.value:e;if(e instanceof CSSMathSum){let t=function(e){const t=e.filter((e=>e instanceof CSSUnitValue));return[...e.filter((e=>!(e instanceof CSSUnitValue))),...Array.from(K(t,"unit").entries()).map((([e,t])=>{const n=t.reduce(((e,{value:t})=>e+t),0);return new CSSUnitValue(n,e)}))]},n=[];for(const i of e.values)i instanceof CSSMathSum?n.push(...i.values):n.push(i);return n=t(n),1===n.length?n[0]:new CSSMathSum(...n)}if(e instanceof CSSMathProduct){let t=[];for(const r of e.values)r instanceof CSSMathProduct?t.push(...r.values):t.push(r);const[n,i]=G(t,(e=>e instanceof CSSUnitValue&&"number"===e.unit));if(n.length>1){const e=n.reduce(((e,{value:t})=>e*t),1);t=[new CSSUnitValue(e,"number"),...i]}if(2===t.length){let e,n;for(const i of t)i instanceof CSSUnitValue&&"number"===i.unit?e=i:i instanceof CSSMathSum&&[...i.values].every((e=>e instanceof CSSUnitValue))&&(n=i);if(e&&n)return new CSSMathSum(...[...n.values].map((t=>new CSSUnitValue(t.value*e.value,t.unit))))}if(t.every((e=>e instanceof CSSUnitValue&&$(e.unit)||e instanceof CSSMathInvert&&e.value instanceof CSSUnitValue&&$(e.value.unit)))){const e=new CSSMathProduct(...t).toSum();if(e&&1===e.values.length)return e.values[0]}return new CSSMathProduct(...t)}return e}const X=null,Y=["percent","length","angle","time","frequency","resolution","flex"],J={fontRelativeLengths:{units:new Set(["em","rem","ex","rex","cap","rcap","ch","rch","ic","ric","lh","rlh"])},viewportRelativeLengths:{units:new Set(["vw","lvw","svw","dvw","vh","lvh","svh","dvh","vi","lvi","svi","dvi","vb","lvb","svb","dvb","vmin","lvmin","svmin","dvmin","vmax","lvmax","svmax","dvmax"])},absoluteLengths:{units:new Set(["cm","mm","Q","in","pt","pc","px"]),compatible:!0,canonicalUnit:"px",ratios:{cm:96/2.54,mm:96/2.54/10,Q:96/2.54/40,in:96,pc:16,pt:96/72,px:1}},angle:{units:new Set(["deg","grad","rad","turn"]),compatible:!0,canonicalUnit:"deg",ratios:{deg:1,grad:.9,rad:180/Math.PI,turn:360}},time:{units:new Set(["s","ms"]),compatible:!0,canonicalUnit:"s",ratios:{s:1,ms:.001}},frequency:{units:new Set(["hz","khz"]),compatible:!0,canonicalUnit:"hz",ratios:{hz:1,khz:1e3}},resolution:{units:new Set(["dpi","dpcm","dppx"]),compatible:!0,canonicalUnit:"dppx",ratios:{dpi:1/96,dpcm:2.54/96,dppx:1}}},Z=new Map;for(const Vt of Object.values(J))if(Vt.compatible)for(const e of Vt.units)Z.set(e,Vt);function ee(e){return Z.get(e)}function te(e,t){const n={...e};for(const i of Object.keys(t))n[i]?n[i]+=t[i]:n[i]=t[i];return n}function ne(e){return"number"===e?{}:"percent"===e?{percent:1}:J.absoluteLengths.units.has(e)||J.fontRelativeLengths.units.has(e)||J.viewportRelativeLengths.units.has(e)?{length:1}:J.angle.units.has(e)?{angle:1}:J.time.units.has(e)?{time:1}:J.frequency.units.has(e)?{frequency:1}:J.resolution.units.has(e)?{resolution:1}:"fr"===e?{flex:1}:X}function ie(e){if(e instanceof CSSUnitValue){let{unit:t,value:n}=e;const i=ee(e.unit);return i&&t!==i.canonicalUnit&&(n*=i.ratios[t],t=i.canonicalUnit),"number"===t?[[n,{}]]:[[n,{[t]:1}]]}if(e instanceof CSSMathInvert){if(!(e.value instanceof CSSUnitValue))throw new Error("Not implemented");const t=ie(e.value);if(t===X)return X;if(t.length>1)return X;const n=t[0],i={};for(const[e,r]of Object.entries(n[1]))i[e]=-1*r;return t[0]=[1/n[0],i],t}if(e instanceof CSSMathProduct){let t=[[1,{}]];for(const n of e.values){const e=ie(n),i=[];if(e===X)return X;for(const n of t)for(const t of e)i.push([n[0]*t[0],te(n[1],t[1])]);t=i}return t}throw new Error("Not implemented")}function re(e,t){if(ne(t)===X)throw new SyntaxError("The string did not match the expected pattern.");const n=ie(e);if(!n)throw new TypeError;if(n.length>1)throw new TypeError("Sum has more than one item");const i=function(e,t){const n=e.unit,i=e.value,r=ee(n),o=ee(t);if(!o||r!==o)return X;return new CSSUnitValue(i*o.ratios[n]/o.ratios[t],t)}(oe(n[0]),t);if(i===X)throw new TypeError;return i}function oe(e){const[t,n]=e,i=Object.entries(n);if(i.length>1)return X;if(0===i.length)return new CSSUnitValue(t,"number");const r=i[0];return 1!==r[1]?X:new CSSUnitValue(t,r[0])}function se(e,...t){if(t&&t.length)throw new Error("Not implemented");const n=ie(e).map((e=>oe(e)));if(n.some((e=>e===X)))throw new TypeError("Type error");return new CSSMathSum(...n)}function ae(e,t){if(e.percentHint&&t.percentHint&&e.percentHint!==t.percentHint)return X;const n={...e,percentHint:e.percentHint??t.percentHint};for(const i of Y)t[i]&&(n[i]??(n[i]=0),n[i]+=t[i]);return n}class CSSFunction{constructor(e,t){__publicField(this,"name"),__publicField(this,"values"),this.name=e,this.values=t}}class CSSSimpleBlock{constructor(e,t){__publicField(this,"value"),__publicField(this,"associatedToken"),this.value=e,this.associatedToken=t}}function le(e){if(Array.isArray(e))return e;if("string"==typeof e)return function(e){const t=new E(e),n=[];for(;;){const e=z(t);if(void 0===e)return n;n.push(e)}}(e);throw new TypeError("Invalid input type "+typeof e)}function ce(e){const t=e.shift();return t instanceof b||t instanceof T||t instanceof w?function(e,t){let n;if(t instanceof b)n=C;else if(t instanceof w)n=x;else{if(!(t instanceof T))return;n=y}const i=new CSSSimpleBlock([],t);for(;;){const t=e.shift();if(t instanceof n)return i;if(void 0===t)return i;e.unshift(t),i.value.push(ce(e))}}(e,t):t instanceof n?function(e,t){const n=new CSSFunction(e.value,[]);for(;;){const e=t.shift();if(e instanceof x)return n;if(void 0===e)return n;t.unshift(e),n.values.push(ce(t))}}(t,e):t}function ue(e){if(e instanceof w||e instanceof x)return 6;if(e instanceof c){switch(e.value){case"*":case"/":return 4;case"+":case"-":return 2}}}function me(e){return e[e.length-1]}function fe(e,t,n){const i=["+","-"].includes(e.value)?"ADDITION":"MULTIPLICATION",r=t.type===i?t.values:[t],o=n.type===i?n.values:[n];return"-"===e.value?o[0]={type:"NEGATE",value:o[0]}:"/"===e.value&&(o[0]={type:"INVERT",value:o[0]}),{type:i,values:[...r,...o]}}function he(e){if("ADDITION"===e.type)return new CSSMathSum(...e.values.map((e=>he(e))));if("MULTIPLICATION"===e.type)return new CSSMathProduct(...e.values.map((e=>he(e))));if("NEGATE"===e.type)return new CSSMathNegate(he(e.value));if("INVERT"===e.type)return new CSSMathInvert(he(e.value));if(e instanceof CSSSimpleBlock)return pe(new CSSFunction("calc",e.value));if(e instanceof t){if("e"===e.value)return new CSSUnitValue(Math.E,"number");if("pi"===e.value)return new CSSUnitValue(Math.PI,"number");throw new SyntaxError("Invalid math expression")}return de(e)}function pe(e){if("min"===e.name||"max"===e.name){const t=e.values.filter((e=>!(e instanceof h||e instanceof v))).map((e=>Q(pe(new CSSFunction("calc",e)))));return"min"===e.name?new CSSMathMin(...t):new CSSMathMax(...t)}if("calc"!==e.name)return null;const n=he(function(e){const n=[],i=[];for(;e.length;){const r=e.shift();if(r instanceof u||r instanceof f||r instanceof m||r instanceof CSSFunction||r instanceof CSSSimpleBlock||r instanceof t)i.push(r);else if(r instanceof c&&["*","/","+","-"].includes(r.value)){for(;n.length&&!(me(n)instanceof w)&&ue(me(n))>ue(r);){const e=n.pop(),t=i.pop(),r=i.pop();i.push(fe(e,r,t))}n.push(r)}else if(r instanceof w)n.push(r);else if(r instanceof x){if(!n.length)return null;for(;!(me(n)instanceof w);){const e=n.pop(),t=i.pop(),r=i.pop();i.push(fe(e,r,t))}if(!(me(n)instanceof w))return null;n.pop()}else if(!(r instanceof h))return null}for(;n.length;){if(me(n)instanceof w)return null;const e=n.pop(),t=i.pop(),r=i.pop();i.push(fe(e,r,t))}return i[0]}([...e.values]));let i;try{i=Q(n)}catch(r){(new CSSStyleSheet).insertRule("error",0)}return i instanceof CSSUnitValue?new CSSMathSum(i):i}function de(e){return e instanceof CSSFunction&&["calc","min","max","clamp"].includes(e.name)?pe(e):e instanceof u&&0===e.value&&!e.unit?new CSSUnitValue(0,"px"):e instanceof u?new CSSUnitValue(e.value,"number"):e instanceof m?new CSSUnitValue(e.value,"percent"):e instanceof f?new CSSUnitValue(e.value,e.unit):void 0}function Se(e){const t=function(e){const t=le(e);for(;t[0]instanceof h;)t.shift();if(void 0===t[0])return null;const n=ce(t);for(;t[0]instanceof h;)t.shift();return void 0===t[0]?n:null}(e);if(null===t&&(new CSSStyleSheet).insertRule("error",0),t instanceof u||t instanceof m||t instanceof f||t instanceof CSSFunction||(new CSSStyleSheet).insertRule("error",0),t instanceof f){null===ne(t.unit)&&(new CSSStyleSheet).insertRule("error",0)}return de(t)}!function(){let e=new WeakMap;function t(e){const t=[];for(let i=0;i<e.length;i++)t[i]="number"==typeof(n=e[i])?new CSSUnitValue(n,"number"):n;var n;return t}class CSSNumericValue2{static parse(e){return e instanceof CSSNumericValue2?e:Q(Se(e),{})}}class CSSMathValue extends CSSNumericValue2{constructor(n,i,r,o){super(),e.set(this,{values:t(n),operator:i,name:r||i,delimiter:o||", "})}get operator(){return e.get(this).operator}get values(){return e.get(this).values}toString(){const t=e.get(this);return`${t.name}(${t.values.join(t.delimiter)})`}}const n={CSSNumericValue:CSSNumericValue2,CSSMathValue:CSSMathValue,CSSUnitValue:class extends CSSNumericValue2{constructor(t,n){super(),e.set(this,{value:t,unit:n})}get value(){return e.get(this).value}set value(t){e.get(this).value=t}get unit(){return e.get(this).unit}to(e){return re(this,e)}toSum(...e){return se(this,...e)}type(){return ne(e.get(this).unit)}toString(){const t=e.get(this);return`${t.value}${function(e){switch(e){case"percent":return"%";case"number":return"";default:return e.toLowerCase()}}(t.unit)}`}},CSSKeywordValue:class{constructor(e){this.value=e}toString(){return this.value.toString()}},CSSMathSum:class extends CSSMathValue{constructor(e){super(arguments,"sum","calc"," + ")}},CSSMathProduct:class extends CSSMathValue{constructor(e){super(arguments,"product","calc"," * ")}toSum(...e){return se(this,...e)}type(){return e.get(this).values.map((e=>e.type())).reduce(ae)}},CSSMathNegate:class extends CSSMathValue{constructor(e){super([arguments[0]],"negate","-")}get value(){return e.get(this).values[0]}type(){return this.value.type()}},CSSMathInvert:class extends CSSMathValue{constructor(e){super([1,arguments[0]],"invert","calc"," / ")}get value(){return e.get(this).values[1]}type(){return function(e){const t={};for(const n of Y)t[n]=-1*e[n];return t}(e.get(this).values[1].type())}},CSSMathMax:class extends CSSMathValue{constructor(){super(arguments,"max")}},CSSMathMin:class extends CSSMathValue{constructor(){super(arguments,"min")}}};if(!window.CSS&&!Reflect.defineProperty(window,"CSS",{value:{}}))throw Error("Error installing CSSOM support");window.CSSUnitValue||["number","percent","em","ex","px","cm","mm","in","pt","pc","Q","vw","vh","vmin","vmax","rems","ch","deg","rad","grad","turn","ms","s","Hz","kHz","dppx","dpi","dpcm","fr"].forEach((e=>{if(!Reflect.defineProperty(CSS,e,{value:t=>new CSSUnitValue(t,e)}))throw Error(`Error installing CSS.${e}`)}));for(let[i,r]of Object.entries(n))if(!(i in window)&&!Reflect.defineProperty(window,i,{value:r}))throw Error(`Error installing CSSOM support for ${i}`)}();const ge="block";let ve=new WeakMap,Te=new WeakMap;const ye=["entry","exit","cover","contain","entry-crossing","exit-crossing"];function we(e){return e===document.scrollingElement?document:e}function xe(e){Ee(e);let t=ve.get(e).animations;if(0===t.length)return;let n=e.currentTime;for(let i=0;i<t.length;i++)t[i].tickAnimation(n)}function be(e,t){if(!e)return null;const n=Te.get(e).sourceMeasurements,i=getComputedStyle(e);let r=n.scrollTop;return"x"===q(t,i)&&(r=Math.abs(n.scrollLeft)),r}function Ce(e,t){const n=Q(e,t);if(n instanceof CSSUnitValue){if("px"===n.unit)return n.value;throw TypeError("Unhandled unit type "+n.unit)}throw TypeError("Unsupported value type: "+typeof e)}function Ee(e){if(!(e instanceof $e))return void function(e){const t=ve.get(e);if(!t.anonymousSource)return;const n=_e(t.anonymousSource,t.anonymousTarget);Re(e,n)}(e);const t=e.subject;if(!t)return void Re(e,null);if("none"==getComputedStyle(t).display)return void Re(e,null);Re(e,We(t))}function ke(e){return["block","inline","x","y"].includes(e)}function Me(e){const t=getComputedStyle(e);return{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,clientWidth:e.clientWidth,clientHeight:e.clientHeight,writingMode:t.writingMode,direction:t.direction,scrollPaddingTop:t.scrollPaddingTop,scrollPaddingBottom:t.scrollPaddingBottom,scrollPaddingLeft:t.scrollPaddingLeft,scrollPaddingRight:t.scrollPaddingRight}}function Pe(e,t){if(!e||!t)return;let n=0,i=0,r=t;const o=e.offsetParent;for(;r&&r!=o;)i+=r.offsetLeft,n+=r.offsetTop,r=r.offsetParent;i-=e.offsetLeft+e.clientLeft,n-=e.offsetTop+e.clientTop;const s=getComputedStyle(t);return{top:n,left:i,offsetWidth:t.offsetWidth,offsetHeight:t.offsetHeight,fontSize:s.fontSize}}function Ie(e){let t=Te.get(e);if(!t||!e||!e.isConnected){return}t.sourceMeasurements=Me(e);for(const n of t.timelineRefs){const t=n.deref();if(t instanceof $e){ve.get(t).subjectMeasurements=Pe(e,t.subject)}}t.updateScheduled||(setTimeout((()=>{for(const e of t.timelineRefs){const t=e.deref();t&&xe(t)}t.updateScheduled=!1})),t.updateScheduled=!0)}function Re(e,t){const n=ve.get(e),i=n.source;if(i!=t){if(i){const t=Te.get(i);if(t){const n=Array.from(t.timelineRefs).filter((t=>void 0===t.deref()||t.deref()===e));for(const e of n)t.timelineRefs.delete(e);0===t.timelineRefs.size&&(t.disconnect(),Te.delete(i))}}if(n.source=t,t){let i=Te.get(t);if(!i){i={timelineRefs:new Set,sourceMeasurements:Me(t)},Te.set(t,i);const e=new ResizeObserver((()=>{Ie(t)}));e.observe(t);for(const n of t.children)e.observe(n);const r=new MutationObserver((e=>{for(const t of e)Ie(t.target)}));r.observe(t,{attributes:!0,attributeFilter:["style","class"]});const o=()=>{i.sourceMeasurements.scrollLeft=t.scrollLeft,i.sourceMeasurements.scrollTop=t.scrollTop;for(const e of i.timelineRefs){const t=e.deref();t&&xe(t)}};we(t).addEventListener("scroll",o),i.disconnect=()=>{e.disconnect(),r.disconnect(),we(t).removeEventListener("scroll",o)}}i.timelineRefs.add(new WeakRef(e))}}}function Ne(e,t){let n=ve.get(e).animations;for(let i=0;i<n.length;i++)n[i].animation==t&&n.splice(i,1)}function Ae(e,t,n){let i=ve.get(e).animations;for(let r=0;r<i.length;r++)if(i[r].animation==t)return;i.push({animation:t,tickAnimation:n}),queueMicrotask((()=>{xe(e)}))}class ScrollTimeline{constructor(e){ve.set(this,{source:null,axis:ge,anonymousSource:e?e.anonymousSource:null,anonymousTarget:e?e.anonymousTarget:null,subject:null,inset:null,animations:[],subjectMeasurements:null});if(Re(this,e&&void 0!==e.source?e.source:document.scrollingElement),e&&void 0!==e.axis&&e.axis!=ge){if(!ke(e.axis))throw TypeError("Invalid axis");ve.get(this).axis=e.axis}xe(this)}set source(e){Re(this,e),xe(this)}get source(){return ve.get(this).source}set axis(e){if(!ke(e))throw TypeError("Invalid axis");ve.get(this).axis=e,xe(this)}get axis(){return ve.get(this).axis}get duration(){return CSS.percent(100)}get phase(){const e=this.source;if(!e)return"inactive";let t=getComputedStyle(e);return"none"==t.display?"inactive":e==document.scrollingElement||"visible"!=t.overflow&&"clip"!=t.overflow?"active":"inactive"}get currentTime(){const e=null,t=this.source;if(!t||!t.isConnected)return e;if("inactive"==this.phase)return e;const n=getComputedStyle(t);if("inline"===n.display||"none"===n.display)return e;const i=this.axis,r=be(t,i),o=function(e,t){const n=Te.get(e).sourceMeasurements,i="horizontal-tb"==getComputedStyle(e).writingMode;return"block"===t?t=i?"y":"x":"inline"===t&&(t=i?"x":"y"),"y"===t?n.scrollHeight-n.clientHeight:"x"===t?n.scrollWidth-n.clientWidth:void 0}(t,i);return o>0?CSS.percent(100*r/o):CSS.percent(100)}get __polyfill(){return!0}}function Ve(e,t){let n=e.parentElement;for(;null!=n;){if(t(n))return n;n=n.parentElement}}function _e(e,t){switch(e){case"root":return document.scrollingElement;case"nearest":return We(t);case"self":return t;default:throw new TypeError("Invalid ScrollTimeline Source Type.")}}function Le(e){switch(getComputedStyle(e).display){case"block":case"inline-block":case"list-item":case"table":case"table-caption":case"flow-root":case"flex":case"grid":return!0}return!1}function Oe(e){const t=getComputedStyle(e);return"none"!=t.transform||"none"!=t.perspective||("transform"==t.willChange||"perspective"==t.willChange||("none"!=t.filter||"filter"==t.willChange||"none"!=t.backdropFilter))}function Ue(e){return"static"!=getComputedStyle(e).position||Oe(e)}function je(e){switch(getComputedStyle(e).position){case"static":case"relative":case"sticky":return Ve(e,Le);case"absolute":return Ve(e,Ue);case"fixed":return Ve(e,Oe)}}function We(e){if(e&&e.isConnected){for(;e=je(e);){switch(getComputedStyle(e)["overflow-x"]){case"auto":case"scroll":case"hidden":return e==document.body&&"visible"==getComputedStyle(document.scrollingElement).overflow?document.scrollingElement:e}}return document.scrollingElement}}function Fe(e,t){const n=ve.get(e);if(!n.source||!n.source.isConnected||"inactive"===e.phase)return null;artsRefreshInset(n);const i=n.subjectMeasurements,r=Te.get(n.source).sourceMeasurements;return e instanceof $e?De(t,r,i,n.axis,n.inset):null}function De(e,t,n,i,r){const o="rtl"==t.direction||"vertical-rl"==t.writingMode;let s,a,l={fontSize:n.fontSize};"x"===q(i,t)?(s=n.offsetWidth,a=n.left,l.scrollPadding=[t.scrollPaddingLeft,t.scrollPaddingRight],o&&(a+=t.scrollWidth-t.clientWidth,l.scrollPadding=[t.scrollPaddingRight,t.scrollPaddingLeft]),l.containerSize=t.clientWidth):(s=n.offsetHeight,a=n.top,l.scrollPadding=[t.scrollPaddingTop,t.scrollPaddingBottom],l.containerSize=t.clientHeight);const c=function(e,t){const n={start:0,end:0};if(!e)return n;const[i,r]=[e.start,e.end].map(((e,n)=>"auto"===e?"auto"===t.scrollPadding[n]?0:parseFloat(t.scrollPadding[n]):Ce(e,{percentageReference:CSS.px(t.containerSize),fontSize:CSS.px(parseFloat(t.fontSize))})));return{start:i,end:r}}(r,l),u=a-l.containerSize+c.end,m=a+s-c.start,f=u+s,h=m-s,p=Math.min(f,h),d=Math.max(f,h);let S,g;const v=s>l.containerSize-c.start-c.end;switch(e){case"cover":S=u,g=m;break;case"contain":S=p,g=d;break;case"entry":S=u,g=p;break;case"exit":S=d,g=m;break;case"entry-crossing":S=u,g=v?d:p;break;case"exit-crossing":S=v?p:d,g=m}return{start:S,end:g}}function ze(e,t){if(e instanceof $e){const{rangeName:n,offset:i}=t;return He(Fe(e,n),i,Fe(e,"cover"),e.subject)}if(e instanceof ScrollTimeline){const{axis:n,source:i}=e,{sourceMeasurements:r}=Te.get(i);let o;o="x"===q(n,r)?r.scrollWidth-r.clientWidth:r.scrollHeight-r.clientHeight;return Ce(t,{percentageReference:CSS.px(o)})/o}unsupportedTimeline(e)}function He(e,t,n,i){if(!e||!n)return 0;let r=getComputedStyle(i);return(Ce(t,{percentageReference:CSS.px(e.end-e.start),fontSize:CSS.px(parseFloat(r.fontSize))})+e.start-n.start)/(n.end-n.start)}let $e=class ViewTimeline extends ScrollTimeline{constructor(e){super(e);const t=ve.get(this);if(t.subject=e&&e.subject?e.subject:void 0,e&&e.inset&&(t.artsInset=e.inset,artsRefreshInset(t)),t.subject){const r=new ResizeObserver((()=>{Ie(t.source)})),o=new MutationObserver((()=>{Ie(t.source)}));r.observe(t.subject),o.observe(t.subject,{attributes:!0,attributeFilter:["class","style"]}),t.artsSubjectObservers=[r,o]}Ee(this),t.subjectMeasurements=Pe(t.source,t.subject),xe(this)}get source(){return Ee(this),ve.get(this).source}set source(e){throw new Error("Cannot set the source of a view timeline")}get subject(){return ve.get(this).subject}get axis(){return ve.get(this).axis}get currentTime(){const e=null,t=be(this.source,this.axis);if(t==e)return e;const n=Fe(this,"cover");if(!n)return e;const i=(t-n.start)/(n.end-n.start);return CSS.percent(100*i)}get startOffset(){return CSS.px(Fe(this,"cover").start)}get endOffset(){return CSS.px(Fe(this,"cover").end)}};const qe=document.getAnimations,Be=window.Element.prototype.getAnimations,Ke=window.Element.prototype.animate,Ge=window.Animation;class Qe{constructor(){this.state="pending",this.nativeResolve=this.nativeReject=null,this.promise=new Promise(((e,t)=>{this.nativeResolve=e,this.nativeReject=t}))}resolve(e){this.state="resolved",this.nativeResolve(e)}reject(e){this.state="rejected",this.promise.catch((()=>{})),this.nativeReject(e)}}function Xe(e){e.readyPromise=new Qe,requestAnimationFrame((()=>{var t;null!==((null==(t=e.timeline)?void 0:t.currentTime)??null)&&(dt(e),"play"!==e.pendingTask||null===e.startTime&&null===e.holdTime?"pause"===e.pendingTask&&tt(e):et(e))}))}function Ye(){return new DOMException("The user aborted a request","AbortError")}function Je(e,t){if(null===t)return t;if("number"!=typeof t)throw new DOMException(`Unexpected value: ${t}.  Cannot convert to CssNumberish`,"InvalidStateError");const n=e.rangeDuration??100,i=at(e),r=i?n*t/i:0;return CSS.percent(r)}function Ze(e,t){if(e.timeline){if(null===t)return t;if("percent"===t.unit){const n=e.rangeDuration??100,i=at(e);return n?t.value*i/n:0}throw new DOMException("CSSNumericValue must be a percentage for progress based animations.","NotSupportedError")}{if(null==t||"number"==typeof t)return t;const e=t.to("ms");if(e)return e.value;throw new DOMException("CSSNumericValue must be either a number or a time value for time based animations.","InvalidStateError")}}function et(e){const t=Ze(e,e.timeline.currentTime);if(null!=e.holdTime)rt(e),0==e.animation.playbackRate?e.startTime=t:(e.startTime=t-e.holdTime/e.animation.playbackRate,e.holdTime=null);else if(null!==e.startTime&&null!==e.pendingPlaybackRate){const n=(t-e.startTime)*e.animation.playbackRate;rt(e);const i=e.animation.playbackRate;0==i?(e.holdTime=null,e.startTime=t):e.startTime=t-n/i}e.readyPromise&&"pending"==e.readyPromise.state&&e.readyPromise.resolve(e.proxy),st(e,!1,!1),lt(e),e.pendingTask=null}function tt(e){const t=Ze(e,e.timeline.currentTime);null!=e.startTime&&null==e.holdTime&&(e.holdTime=(t-e.startTime)*e.animation.playbackRate),rt(e),e.startTime=null,e.readyPromise.resolve(e.proxy),st(e,!1,!1),lt(e),e.pendingTask=null}function nt(e){if(!e.finishedPromise||"pending"!=e.finishedPromise.state)return;if("finished"!=e.proxy.playState)return;e.finishedPromise.resolve(e.proxy),e.animation.pause();const t=new CustomEvent("finish",{detail:{currentTime:e.proxy.currentTime,timelineTime:e.proxy.timeline.currentTime}});Object.defineProperty(t,"currentTime",{get:function(){return this.detail.currentTime}}),Object.defineProperty(t,"timelineTime",{get:function(){return this.detail.timelineTime}}),requestAnimationFrame((()=>{queueMicrotask((()=>{e.animation.dispatchEvent(t)}))}))}function it(e){return null!==e.pendingPlaybackRate?e.pendingPlaybackRate:e.animation.playbackRate}function rt(e){null!==e.pendingPlaybackRate&&(e.animation.playbackRate=e.pendingPlaybackRate,e.pendingPlaybackRate=null)}function ot(e){if(!e.timeline)return null;const t=Ze(e,e.timeline.currentTime);if(null===t)return null;if(null===e.startTime)return null;let n=(t-e.startTime)*e.animation.playbackRate;return-0==n&&(n=0),n}function st(e,t,n){if(!e.timeline)return;let i=t?Ze(e,e.proxy.currentTime):ot(e);if(i&&null!=e.startTime&&!e.proxy.pending){const n=it(e),r=at(e);let o=e.previousCurrentTime;n>0&&i>=r&&null!=e.previousCurrentTime?((null===o||o<r)&&(o=r),e.holdTime=t?i:o):n<0&&i<=0?((null==o||o>0)&&(o=0),e.holdTime=t?i:o):0!=n&&(t&&null!==e.holdTime&&(e.startTime=function(e,t){if(!e.timeline)return null;const n=Ze(e,e.timeline.currentTime);return null==n?null:n-t/e.animation.playbackRate}(e,e.holdTime)),e.holdTime=null)}lt(e),e.previousCurrentTime=Ze(e,e.proxy.currentTime);"finished"==e.proxy.playState?(e.finishedPromise||(e.finishedPromise=new Qe),"pending"==e.finishedPromise.state&&(n?nt(e):Promise.resolve().then((()=>{nt(e)})))):(e.finishedPromise&&"resolved"==e.finishedPromise.state&&(e.finishedPromise=new Qe),"paused"!=e.animation.playState&&e.animation.pause())}function at(e){const t=function(e){const t=e.proxy.effect.getTiming();return e.normalizedTiming||t}(e),n=t.delay+t.endDelay+t.iterations*t.duration;return Math.max(0,n)}function lt(e){if(e.timeline)if(null!==e.startTime){const t=e.timeline.currentTime;if(null==t)return;ct(e,(Ze(e,t)-e.startTime)*e.animation.playbackRate)}else null!==e.holdTime&&ct(e,e.holdTime)}function ct(e,t){const n=e.timeline,i=e.animation.playbackRate,r=n.currentTime&&n.currentTime.value==(i<0?0:100)?i<0?.001:-.001:0;e.animation.currentTime=t+r}function ut(e,t){if(!e.timeline)return;const n="paused"==e.proxy.playState&&e.proxy.pending;let i=!1,r=Ze(e,e.proxy.currentTime);0==it(e)&&null==r&&(e.holdTime=0),null==r&&(e.autoAlignStartTime=!0),("finished"===e.proxy.playState||n)&&(e.holdTime=null,e.startTime=null,e.autoAlignStartTime=!0),e.holdTime&&(e.startTime=null),e.pendingTask&&(e.pendingTask=null,i=!0),(null!==e.holdTime||e.autoAlignStartTime||n||null!==e.pendingPlaybackRate)&&(e.readyPromise&&!i&&(e.readyPromise=null),lt(e),e.readyPromise||Xe(e),e.pendingTask="play",Ae(e.timeline,e.animation,mt.bind(e.proxy)),st(e,!1,!1))}function mt(e){const t=ht.get(this);if(!t)return;if(null==e)return void("paused"!==t.proxy.playState&&"idle"!=t.animation.playState&&t.animation.cancel());dt(t),t.pendingTask&&requestAnimationFrame((()=>{"play"!==t.pendingTask||null===t.startTime&&null===t.holdTime?"pause"===t.pendingTask&&tt(t):et(t)}));const n=this.playState;if("running"==n||"finished"==n){const n=Ze(t,e);ct(t,(n-Ze(t,this.startTime))*this.playbackRate),st(t,!1,!1)}}function ft(e){e.specifiedTiming=null}let ht=new WeakMap;window.addEventListener("pagehide",(e=>{ht=new WeakMap}),!1);let pt=new WeakMap;function dt(e){if(!e.autoAlignStartTime)return;if(!e.timeline||!e.timeline.currentTime)return;if("idle"===e.proxy.playState||"paused"===e.proxy.playState&&null!==e.holdTime)return;const t=e.rangeDuration;let n,i;try{n=CSS.percent(100*function(e){if(!e.animationRange)return 0;const t="normal"===e.animationRange.start?gt(e.timeline):e.animationRange.start;return ze(e.timeline,t)}(e))}catch(o){n=CSS.percent(0),e.animationRange.start="normal",console.warn("Exception when calculating start offset",o)}try{i=CSS.percent(100*(1-function(e){if(!e.animationRange)return 0;const t="normal"===e.animationRange.end?vt(e.timeline):e.animationRange.end;return 1-ze(e.timeline,t)}(e)))}catch(o){i=CSS.percent(100),e.animationRange.end="normal",console.warn("Exception when calculating end offset",o)}e.rangeDuration=i.value-n.value;const r=it(e);e.startTime=Ze(e,r>=0?n:i),e.holdTime=null,e.rangeDuration!==t&&ft(e)}function St(e){throw new Error("Unsupported timeline class")}function gt(e){return e instanceof ViewTimeline?{rangeName:"cover",offset:CSS.percent(0)}:e instanceof ScrollTimeline?CSS.percent(0):void St()}function vt(e){return e instanceof ViewTimeline?{rangeName:"cover",offset:CSS.percent(100)}:e instanceof ScrollTimeline?CSS.percent(100):void St()}function Tt(e,t){if(!t)return{start:"normal",end:"normal"};const n={start:gt(e),end:vt(e)};if(e instanceof ViewTimeline){const e=B(t),i=[],r=[];if(e.forEach((e=>{if(ye.includes(e))i.push(e);else try{r.push(CSSNumericValue.parse(e))}catch(n){throw TypeError(`Could not parse range "${t}"`)}})),i.length>2||r.length>2||1==r.length)throw TypeError("Invalid time range or unsupported time range format.");return i.length&&(n.start.rangeName=i[0],n.end.rangeName=i.length>1?i[1]:i[0]),r.length>1&&(n.start.offset=r[0],n.end.offset=r[1]),n}if(e instanceof ScrollTimeline){const e=t.split(" ");if(2!=e.length)throw TypeError("Invalid time range or unsupported time range format.");return n.start=CSSNumericValue.parse(e[0]),n.end=CSSNumericValue.parse(e[1]),n}St()}function yt(e,t,n){if(!t||"normal"===t)return"normal";if(e instanceof ViewTimeline){let e="cover",i="start"===n?CSS.percent(0):CSS.percent(100);if(t instanceof Object)void 0!==t.rangeName&&(e=t.rangeName),void 0!==t.offset&&(i=t.offset);else{const n=B(t);1===n.length?ye.includes(n[0])?e=n[0]:i=Q(CSSNumericValue.parse(n[0]),{}):2===n.length&&(e=n[0],i=Q(CSSNumericValue.parse(n[1]),{}))}if(!ye.includes(e))throw TypeError("Invalid range name");return{rangeName:e,offset:i}}if(e instanceof ScrollTimeline)return CSSNumericValue.parse(t);St()}class wt{constructor(e,t,n={}){const i=t instanceof ScrollTimeline,r=e instanceof Ge?e:new Ge(e,i?void 0:t);pt.set(r,this),ht.set(this,{animation:r,timeline:i?t:void 0,playState:i?"idle":null,readyPromise:null,finishedPromise:null,startTime:null,holdTime:null,rangeDuration:null,previousCurrentTime:null,autoAlignStartTime:!1,pendingPlaybackRate:null,pendingTask:null,specifiedTiming:null,normalizedTiming:null,effect:null,animationRange:i?Tt(t,n["animation-range"]):null,proxy:this})}get effect(){const e=ht.get(this);return e.timeline?(e.effect||(e.effect=function(e){const t=e.animation.effect,n=t.updateTiming,i={apply:function(n){t.getTiming();const i=n.apply(t);if(e.timeline){const t=e.duration??100;i.localTime=Je(e,i.localTime),i.endTime=Je(e,i.endTime),i.activeDuration=Je(e,i.activeDuration);const n=at(e),r=i.iterations?(n-i.delay-i.endDelay)/i.iterations:0;i.duration=n?CSS.percent(t*r/n):CSS.percent(0),void 0===e.timeline.currentTime&&(i.localTime=null)}return i}},r={apply:function(i,r){if(e.specifiedTiming)return e.specifiedTiming;e.specifiedTiming=i.apply(t);let o,s=Object.assign({},e.specifiedTiming);if(s.duration===1/0)throw TypeError("Effect duration cannot be Infinity when used with Scroll Timelines");return(null===s.duration||"auto"===s.duration||e.autoDurationEffect)&&e.timeline&&(e.autoDurationEffect=!0,s.delay=0,s.endDelay=0,o=s.iterations?1e5:0,s.duration=s.iterations?(o-s.delay-s.endDelay)/s.iterations:0,s.duration<0&&(s.duration=0,s.endDelay=o-s.delay),n.apply(t,[s])),e.normalizedTiming=s,e.specifiedTiming}},o={apply:function(n,i,r){if(r&&r.length){if(e.timeline&&r[0]){const t=r[0],n=t.duration;if(n===1/0)throw TypeError("Effect duration cannot be Infinity when used with Scroll Timelines");if(t.iterations===1/0)throw TypeError("Effect iterations cannot be Infinity when used with Scroll Timelines");void 0!==n&&"auto"!==n&&(e.autoDurationEffect=null)}e.specifiedTiming&&n.apply(t,[e.specifiedTiming]),n.apply(t,r),ft(e)}}},s=new Proxy(t,{get:function(e,n){const i=e[n];return"function"==typeof i?i.bind(t):i},set:function(e,t,n){return e[t]=n,!0}});return s.getComputedTiming=new Proxy(t.getComputedTiming,i),s.getTiming=new Proxy(t.getTiming,r),s.updateTiming=new Proxy(t.updateTiming,o),s}(e)),e.effect):e.animation.effect}set effect(e){const t=ht.get(this);t.animation.effect=e,t.effect=null,t.autoDurationEffect=null}get timeline(){const e=ht.get(this);return e.timeline||e.animation.timeline}set timeline(e){const t=ht.get(this),n=this.timeline;if(n==e)return;const i=this.playState,r=this.currentTime;let o,s=at(t);o=null===r?null:0===s?0:Ze(t,r)/s;const a=n instanceof ScrollTimeline,l=e instanceof ScrollTimeline,c=this.pending;if(a&&Ne(t.timeline,t.animation),l)return t.timeline=e,rt(t),t.autoAlignStartTime=!0,t.startTime=null,t.holdTime=null,"running"!==i&&"finished"!==i||(t.readyPromise&&"resolved"!==t.readyPromise.state||Xe(t),t.pendingTask="play",Ae(t.timeline,t.animation,mt.bind(this))),"paused"===i&&null!==o&&(t.holdTime=o*s),c&&(t.readyPromise&&"resolved"!=t.readyPromise.state||Xe(t),t.pendingTask="paused"==i?"pause":"play"),null!==t.startTime&&(t.holdTime=null),void st(t,!1,!1);if(t.animation.timeline!=e)throw TypeError("Unsupported timeline: "+e);if(Ne(t.timeline,t.animation),t.timeline=null,a)switch(null!==r&&(t.animation.currentTime=o*at(t)),i){case"paused":t.animation.pause();break;case"running":case"finished":t.animation.play()}}get startTime(){const e=ht.get(this);return e.timeline?Je(e,e.startTime):e.animation.startTime}set startTime(e){const t=ht.get(this);if(e=Ze(t,e),!t.timeline)return void(t.animation.startTime=e);t.autoAlignStartTime=!1;null==Ze(t,t.timeline.currentTime)&&null!=t.startTime&&(t.holdTime=null,lt(t));const n=Ze(t,this.currentTime);rt(t),t.startTime=e,null!==t.startTime&&0!=t.animation.playbackRate?t.holdTime=null:t.holdTime=n,t.pendingTask&&(t.pendingTask=null,t.readyPromise.resolve(this)),st(t,!0,!1),lt(t)}get currentTime(){const e=ht.get(this);return e.timeline?null!=e.holdTime?Je(e,e.holdTime):Je(e,ot(e)):e.animation.currentTime}set currentTime(e){const t=ht.get(this);t.timeline?(!function(e,t){if(null==t&&null!==e.currentTime)throw new TypeError;t=Ze(e,t),e.autoAlignStartTime=!1,null!==e.holdTime||null===e.startTime||"inactive"===e.timeline.phase||0===e.animation.playbackRate?e.holdTime=t:e.startTime=Ze(e,e.timeline.currentTime)-t/e.animation.playbackRate,"inactive"===e.timeline.phase&&(e.startTime=null),e.previousCurrentTime=null}(t,e),"pause"==t.pendingTask&&(t.holdTime=Ze(t,e),rt(t),t.startTime=null,t.pendingTask=null,t.readyPromise.resolve(this)),st(t,!0,!1)):t.animation.currentTime=e}get playbackRate(){return ht.get(this).animation.playbackRate}set playbackRate(e){const t=ht.get(this);if(!t.timeline)return void(t.animation.playbackRate=e);t.pendingPlaybackRate=null;const n=this.currentTime;t.animation.playbackRate=e,null!==n&&(this.currentTime=n)}get playState(){const e=ht.get(this);if(!e.timeline)return e.animation.playState;const t=Ze(e,this.currentTime);if(null===t&&null===e.startTime&&null==e.pendingTask)return"idle";if("pause"==e.pendingTask||null===e.startTime&&"play"!=e.pendingTask)return"paused";if(null!=t){if(e.animation.playbackRate>0&&t>=at(e))return"finished";if(e.animation.playbackRate<0&&t<=0)return"finished"}return"running"}get rangeStart(){var e;return(null==(e=ht.get(this).animationRange)?void 0:e.start)??"normal"}set rangeStart(e){const t=ht.get(this);if(!t.timeline)return t.animation.rangeStart=e;if(t.timeline instanceof ScrollTimeline){t.animationRange.start=yt(t.timeline,e,"start"),dt(t),lt(t)}}get rangeEnd(){var e;return(null==(e=ht.get(this).animationRange)?void 0:e.end)??"normal"}set rangeEnd(e){const t=ht.get(this);if(!t.timeline)return t.animation.rangeEnd=e;if(t.timeline instanceof ScrollTimeline){t.animationRange.end=yt(t.timeline,e,"end"),dt(t),lt(t)}}get replaceState(){return ht.get(this).animation.pending}get pending(){const e=ht.get(this);return e.timeline?!!e.readyPromise&&"pending"==e.readyPromise.state:e.animation.pending}finish(){const e=ht.get(this);if(!e.timeline)return void e.animation.finish();const t=it(e),n=at(e);if(0==t)throw new DOMException("Cannot finish Animation with a playbackRate of 0.","InvalidStateError");if(t>0&&n==1/0)throw new DOMException("Cannot finish Animation with an infinite target effect end.","InvalidStateError");rt(e);const i=t<0?0:n;this.currentTime=Je(e,i);const r=Ze(e,e.timeline.currentTime);null===e.startTime&&null!==r&&(e.startTime=r-i/e.animation.playbackRate),"pause"==e.pendingTask&&null!==e.startTime&&(e.holdTime=null,e.pendingTask=null,e.readyPromise.resolve(this)),"play"==e.pendingTask&&null!==e.startTime&&(e.pendingTask=null,e.readyPromise.resolve(this)),st(e,!0,!0)}play(){const e=ht.get(this);e.timeline?ut(e):e.animation.play()}pause(){const e=ht.get(this);e.timeline?"paused"!=this.playState&&(null===e.animation.currentTime&&(e.autoAlignStartTime=!0),"play"==e.pendingTask?e.pendingTask=null:e.readyPromise=null,e.readyPromise||Xe(e),e.pendingTask="pause",Ae(e.timeline,e.animation,mt.bind(e.proxy))):e.animation.pause()}reverse(){const e=ht.get(this),t=it(e),n=Ze(e,this.currentTime),i=at(e)==1/0,r=0!=t&&(t<0||n>0||!i);if(!e.timeline||!r)return r&&(e.pendingPlaybackRate=-it(e)),void e.animation.reverse();if("inactive"==e.timeline.phase)throw new DOMException("Cannot reverse an animation with no active timeline","InvalidStateError");this.updatePlaybackRate(-t),ut(e)}updatePlaybackRate(e){const t=ht.get(this);if(t.pendingPlaybackRate=e,!t.timeline)return void t.animation.updatePlaybackRate(e);const n=this.playState;if(!t.readyPromise||"pending"!=t.readyPromise.state)switch(n){case"idle":case"paused":rt(t);break;case"finished":const n=Ze(t,t.timeline.currentTime),i=null!==n?(n-t.startTime)*t.animation.playbackRate:null;t.startTime=0==e?n:null!=n&&null!=i?(n-i)/e:null,rt(t),st(t,!1,!1),lt(t);break;default:ut(t)}}persist(){ht.get(this).animation.persist()}get id(){return ht.get(this).animation.id}set id(e){ht.get(this).animation.id=e}cancel(){const e=ht.get(this);e.timeline?("idle"!=this.playState&&(!function(e){e.pendingTask&&(e.pendingTask=null,rt(e),e.readyPromise.reject(Ye()),Xe(e),e.readyPromise.resolve(e.proxy))}(e),e.finishedPromise&&"pending"==e.finishedPromise.state&&e.finishedPromise.reject(Ye()),e.finishedPromise=new Qe,e.animation.cancel()),e.startTime=null,e.holdTime=null,Ne(e.timeline,e.animation)):e.animation.cancel()}get onfinish(){return ht.get(this).animation.onfinish}set onfinish(e){ht.get(this).animation.onfinish=e}get oncancel(){return ht.get(this).animation.oncancel}set oncancel(e){ht.get(this).animation.oncancel=e}get onremove(){return ht.get(this).animation.onremove}set onremove(e){ht.get(this).animation.onremove=e}get finished(){const e=ht.get(this);return e.timeline?(e.finishedPromise||(e.finishedPromise=new Qe),e.finishedPromise.promise):e.animation.finished}get ready(){const e=ht.get(this);return e.timeline?(e.readyPromise||(e.readyPromise=new Qe,e.readyPromise.resolve(this)),e.readyPromise.promise):e.animation.ready}addEventListener(e,t,n){ht.get(this).animation.addEventListener(e,t,n)}removeEventListener(e,t,n){ht.get(this).animation.removeEventListener(e,t,n)}dispatchEvent(e){ht.get(this).animation.dispatchEvent(e)}}function xt(e,t){const n=t.timeline;n instanceof ScrollTimeline&&delete t.timeline;const i=Ke.apply(this,[e,t]),r=new wt(i,n);if(n instanceof ScrollTimeline){i.pause();ht.get(r).animationRange={start:yt(n,t.rangeStart,"start"),end:yt(n,t.rangeEnd,"end")},r.play()}return r}function bt(e){for(let t=0;t<e.length;++t){let n=pt.get(e[t]);n&&(e[t]=n)}return e}function Ct(e){return bt(Be.apply(this,[e]))}function Et(e){return bt(qe.apply(this,[e]))}const kt={IDENTIFIER:/[\w\\\@_-]+/g,WHITE_SPACE:/\s*/g,NUMBER:/^[0-9]+/,TIME:/^[0-9]+(s|ms)/,SCROLL_TIMELINE:/scroll-timeline\s*:([^;}]+)/,SCROLL_TIMELINE_NAME:/scroll-timeline-name\s*:([^;}]+)/,SCROLL_TIMELINE_AXIS:/scroll-timeline-axis\s*:([^;}]+)/,VIEW_TIMELINE:/view-timeline\s*:([^;}]+)/,VIEW_TIMELINE_NAME:/view-timeline-name\s*:([^;}]+)/,VIEW_TIMELINE_AXIS:/view-timeline-axis\s*:([^;}]+)/,VIEW_TIMELINE_INSET:/view-timeline-inset\s*:([^;}]+)/,ANIMATION_TIMELINE:/animation-timeline\s*:([^;}]+)/,ANIMATION_TIME_RANGE:/animation-range\s*:([^;}]+)/,ANIMATION_NAME:/animation-name\s*:([^;}]+)/,ANIMATION:/animation\s*:([^;}]+)/,ANONYMOUS_SCROLL_TIMELINE:/scroll\(([^)]*)\)/,ANONYMOUS_VIEW_TIMELINE:/view\(([^)]*)\)/},Mt=["block","inline","x","y"],Pt=["nearest","root","self"];const It=new class{constructor(){this.cssRulesWithTimelineName=[],this.nextAnonymousTimelineNameIndex=0,this.anonymousScrollTimelineOptions=new Map,this.anonymousViewTimelineOptions=new Map,this.sourceSelectorToScrollTimeline=[],this.subjectSelectorToViewTimeline=[],this.keyframeNamesSelectors=new Map}transpileStyleSheet(e,t,n){const i={sheetSrc:e,index:0,name:n};for(;i.index<i.sheetSrc.length&&(this.eatWhitespace(i),!(i.index>=i.sheetSrc.length));){if(this.lookAhead("/*",i)){for(;this.lookAhead("/*",i);)this.eatComment(i),this.eatWhitespace(i);continue}const e=this.parseQualifiedRule(i);e&&(t?this.parseKeyframesAndSaveNameMapping(e,i):this.handleScrollTimelineProps(e,i))}return i.sheetSrc}getAnimationTimelineOptions(e,t){for(let n=this.cssRulesWithTimelineName.length-1;n>=0;n--){const i=this.cssRulesWithTimelineName[n];try{if(t.matches(i.selector)&&(!i["animation-name"]||i["animation-name"]==e))return{"animation-timeline":i["animation-timeline"],"animation-range":i["animation-range"]}}catch{}}return null}getAnonymousScrollTimelineOptions(e,t){const n=this.anonymousScrollTimelineOptions.get(e);return n?{anonymousSource:n.source,anonymousTarget:t,source:_e(n.source??"nearest",t),axis:n.axis?n.axis:"block"}:null}getScrollTimelineOptions(e,t){const n=this.getAnonymousScrollTimelineOptions(e,t);if(n)return n;for(let i=this.sourceSelectorToScrollTimeline.length-1;i>=0;i--){const n=this.sourceSelectorToScrollTimeline[i];if(n.name==e){const e=this.findPreviousSiblingOrAncestorMatchingSelector(t,n.selector);if(e)return{source:e,...n.axis?{axis:n.axis}:{}}}}return null}findPreviousSiblingOrAncestorMatchingSelector(e,t){let n=e;for(;n;){if(n.matches(t))return n;n=n.previousElementSibling||n.parentElement}return null}getAnonymousViewTimelineOptions(e,t){const n=this.anonymousViewTimelineOptions.get(e);return n?{subject:t,axis:n.axis?n.axis:"block",inset:n.inset?n.inset:"auto"}:null}getViewTimelineOptions(e,t){const n=this.getAnonymousViewTimelineOptions(e,t);if(n)return n;for(let i=this.subjectSelectorToViewTimeline.length-1;i>=0;i--){const n=this.subjectSelectorToViewTimeline[i];if(n.name==e){const e=this.findPreviousSiblingOrAncestorMatchingSelector(t,n.selector);if(e)return{subject:e,axis:n.axis,inset:n.inset}}}return null}handleScrollTimelineProps(e,t){if(e.selector.includes("@keyframes"))return;const n=e.block.contents.includes("animation-name:"),i=e.block.contents.includes("animation-timeline:"),r=e.block.contents.includes("animation:");if(this.saveSourceSelectorToScrollTimeline(e),this.saveSubjectSelectorToViewTimeline(e),!i&&!n&&!r)return;let o=[],s=[],a=!1;i&&(o=this.extractScrollTimelineNames(e.block.contents)),n&&(s=this.extractMatches(e.block.contents,kt.ANIMATION_NAME)),i&&n||(r&&this.extractMatches(e.block.contents,kt.ANIMATION).forEach((t=>{const n=this.extractAnimationName(t);n&&i&&s.push(n),i&&(this.hasDuration(t)||(this.hasAutoDuration(t)&&(e.block.contents=e.block.contents.replace("auto","    ")),e.block.contents=e.block.contents.replace(t," 1s "+t),a=!0))})),a&&this.replacePart(e.block.startIndex,e.block.endIndex,e.block.contents,t)),this.saveRelationInList(e,o,s)}saveSourceSelectorToScrollTimeline(e){const t=e.block.contents.includes("scroll-timeline:"),n=e.block.contents.includes("scroll-timeline-name:"),i=e.block.contents.includes("scroll-timeline-axis:");if(!t&&!n)return;let r=[];if(t){const t=this.extractMatches(e.block.contents,kt.SCROLL_TIMELINE);for(const n of t){const t=this.split(n);let i={selector:e.selector,name:""};1==t.length?i.name=t[0]:2==t.length&&(Mt.includes(t[0])?(i.axis=t[0],i.name=t[1]):(i.axis=t[1],i.name=t[0])),r.push(i)}}if(n){const t=this.extractMatches(e.block.contents,kt.SCROLL_TIMELINE_NAME);for(let n=0;n<t.length;n++)if(n<r.length)r[n].name=t[n];else{let i={selector:e.selector,name:t[n]};r.push(i)}}let o=[];if(i){const t=this.extractMatches(e.block.contents,kt.SCROLL_TIMELINE_AXIS);if(o=t.filter((e=>Mt.includes(e))),o.length!=t.length)throw new Error("Invalid axis")}for(let s=0;s<r.length;s++)o.length&&(r[s].axis=o[s%r.length]);this.sourceSelectorToScrollTimeline.push(...r)}saveSubjectSelectorToViewTimeline(e){const t=e.block.contents.includes("view-timeline:"),n=e.block.contents.includes("view-timeline-name:"),i=e.block.contents.includes("view-timeline-axis:"),r=e.block.contents.includes("view-timeline-inset:");if(!t&&!n)return;let o=[];if(t){const t=this.extractMatches(e.block.contents,kt.VIEW_TIMELINE);for(let n of t){const t=this.split(n);let i={selector:e.selector,name:"",inset:null};1==t.length?i.name=t[0]:2==t.length&&(Mt.includes(t[0])?(i.axis=t[0],i.name=t[1]):(i.axis=t[1],i.name=t[0])),o.push(i)}}if(n){const t=this.extractMatches(e.block.contents,kt.VIEW_TIMELINE_NAME);for(let n=0;n<t.length;n++)if(n<o.length)o[n].name=t[n];else{let i={selector:e.selector,name:t[n],inset:null};o.push(i)}}let s=[],a=[];if(r&&(s=this.extractMatches(e.block.contents,kt.VIEW_TIMELINE_INSET)),i){const t=this.extractMatches(e.block.contents,kt.VIEW_TIMELINE_AXIS);if(a=t.filter((e=>Mt.includes(e))),a.length!=t.length)throw new Error("Invalid axis")}for(let l=0;l<o.length;l++)s.length&&(o[l].inset=s[l%s.length]),a.length&&(o[l].axis=a[l%a.length]);this.subjectSelectorToViewTimeline.push(...o)}hasDuration(e){return e.split(" ").filter((e=>{return t=e,kt.TIME.exec(t);var t})).length>=1}hasAutoDuration(e){return e.split(" ").filter((e=>"auto"===e)).length>=1}saveRelationInList(e,t,n){let i=[];e.block.contents.includes("animation-range:")&&(i=this.extractMatches(e.block.contents,kt.ANIMATION_TIME_RANGE));const r=Math.max(t.length,n.length,i.length);for(let o=0;o<r;o++)this.cssRulesWithTimelineName.push({selector:e.selector,"animation-timeline":t[o%t.length],...n.length?{"animation-name":n[o%n.length]}:{},...i.length?{"animation-range":i[o%i.length]}:{}})}extractScrollTimelineNames(e){const t=kt.ANIMATION_TIMELINE.exec(e)[1].trim(),n=[];return t.split(",").map((e=>e.trim())).forEach((e=>{if(function(e){return(e.startsWith("scroll")||e.startsWith("view"))&&e.includes("(")}(e)){const t=this.saveAnonymousTimelineName(e);n.push(t)}else n.push(e)})),n}saveAnonymousTimelineName(e){const t=":t"+this.nextAnonymousTimelineNameIndex++;return e.startsWith("scroll(")?this.anonymousScrollTimelineOptions.set(t,this.parseAnonymousScrollTimeline(e)):this.anonymousViewTimelineOptions.set(t,this.parseAnonymousViewTimeline(e)),t}parseAnonymousScrollTimeline(e){const t=kt.ANONYMOUS_SCROLL_TIMELINE.exec(e);if(!t)return null;const n=t[1],i={};return n.split(" ").forEach((e=>{Mt.includes(e)?i.axis=e:Pt.includes(e)&&(i.source=e)})),i}parseAnonymousViewTimeline(e){const t=kt.ANONYMOUS_VIEW_TIMELINE.exec(e);if(!t)return null;const n=t[1],i={};return n.split(" ").forEach((e=>{Mt.includes(e)?i.axis=e:i.inset=i.inset?`${i.inset} ${e}`:e})),i}extractAnimationName(e){return this.findMatchingEntryInContainer(e,this.keyframeNamesSelectors)}findMatchingEntryInContainer(e,t){const n=e.split(" ").filter((e=>t.has(e)));return n?n[0]:null}parseIdentifier(e){kt.IDENTIFIER.lastIndex=e.index;const t=kt.IDENTIFIER.exec(e.sheetSrc);if(!t)throw this.parseError(e,"Expected an identifier");return e.index+=t[0].length,t[0]}parseKeyframesAndSaveNameMapping(e,t){if(e.selector.startsWith("@keyframes")){const n=this.replaceKeyframesAndGetMapping(e,t);e.selector.split(" ").forEach(((e,t)=>{t>0&&this.keyframeNamesSelectors.set(e,n)}))}}replaceKeyframesAndGetMapping(e,t){function n(e){return ye.some((t=>e.startsWith(t)))}const i=e.block.contents,r=function(e){let t=0,n=-1,i=-1;const r=[];for(let o=0;o<e.length;o++)"{"==e[o]?t++:"}"==e[o]&&t--,1==t&&"{"!=e[o]&&"}"!=e[o]&&-1==n&&(n=o),2==t&&"{"==e[o]&&(i=o,r.push({start:n,end:i}),n=i=-1);return r}(i);if(0==r.length)return new Map;const o=new Map;let s=!1;const a=[];a.push(i.substring(0,r[0].start));for(let l=0;l<r.length;l++){const e=i.substring(r[l].start,r[l].end);let t=[];e.split(",").forEach((e=>{const i=e.split(" ").map((e=>e.trim())).filter((e=>""!=e)).join(" ");const r=o.size;o.set(r,i),t.push(`${r}%`),n(i)&&(s=!0)})),a.push(t.join(",")),l==r.length-1?a.push(i.substring(r[l].end)):a.push(i.substring(r[l].end,r[l+1].start))}return s?(e.block.contents=a.join(""),this.replacePart(e.block.startIndex,e.block.endIndex,e.block.contents,t),o):new Map}parseQualifiedRule(e){const t=e.index,n=this.parseSelector(e).trim();if(!n)return;return{selector:n,block:this.eatBlock(e),startIndex:t,endIndex:e.index}}removeEnclosingDoubleQuotes(e){let t='"'==e[0]?1:0,n='"'==e[e.length-1]?e.length-1:e.length;return e.substring(t,n)}assertString(e,t){if(e.sheetSrc.substr(e.index,t.length)!=t)throw this.parseError(e,`Did not find expected sequence ${t}`);e.index+=t.length}replacePart(e,t,n,i){if(i.sheetSrc=i.sheetSrc.slice(0,e)+n+i.sheetSrc.slice(t),i.index>=t){const r=i.index-t;i.index=e+n.length+r}}eatComment(e){this.assertString(e,"/*"),this.eatUntil("*/",e,!0),this.assertString(e,"*/")}eatBlock(e){const t=e.index;this.assertString(e,"{");let n=1;for(;0!=n;)this.lookAhead("/*",e)?this.eatComment(e):("{"===e.sheetSrc[e.index]?n++:"}"===e.sheetSrc[e.index]&&n--,this.advance(e));const i=e.index;return{startIndex:t,endIndex:i,contents:e.sheetSrc.slice(t,i)}}advance(e){if(e.index++,e.index>e.sheetSrc.length)throw this.parseError(e,"Advanced beyond the end")}parseError(e,t){return Error(`(${e.name?e.name:"<anonymous file>"}): ${t}`)}eatUntil(e,t,n=!1){const i=t.index;for(;!this.lookAhead(e,t);)this.advance(t);return n&&(t.sheetSrc=t.sheetSrc.slice(0,i)+" ".repeat(t.index-i)+t.sheetSrc.slice(t.index)),t.sheetSrc.slice(i,t.index)}parseSelector(e){let t=e.index;if(this.eatUntil("{",e),t===e.index)throw Error("Empty selector");return e.sheetSrc.slice(t,e.index)}eatWhitespace(e){kt.WHITE_SPACE.lastIndex=e.index;const t=kt.WHITE_SPACE.exec(e.sheetSrc);t&&(e.index+=t[0].length)}lookAhead(e,t){return t.sheetSrc.substr(t.index,e.length)==e}peek(e){return e.sheetSrc[e.index]}extractMatches(e,t,n=","){return t.exec(e)[1].trim().split(n).map((e=>e.trim()))}split(e){return e.split(" ").map((e=>e.trim())).filter((e=>""!=e))}};function Rt(e,t,n,i,r,o){const s=Me(t),a=Pe(t,n);r=typeof r==="string"?artsParseInset(artsResolveVars(r,getComputedStyle(n))??"auto"):r;return He(De(e,s,a,i,r),o,De("cover",s,a,i,r),n)}function Nt(e,t,n){const i=It.getAnimationTimelineOptions(t,n);if(!i)return null;const r=i["animation-timeline"];if(!r)return null;let o=It.getScrollTimelineOptions(r,n)||It.getViewTimelineOptions(r,n);return o?(o.subject&&function(e,t){const n=We(t.subject),i=t.axis||t.axis;function r(e,r){let o=null;for(const[s,a]of e)if(s==100*r.offset){if("from"==a)o=0;else if("to"==a)o=100;else{const e=a.split(" ");o=1==e.length?parseFloat(e[0]):100*Rt(e[0],n,t.subject,i,t.inset,CSS.percent(parseFloat(e[1])))}break}return o}const o=It.keyframeNamesSelectors.get(e.animationName);if(o&&o.size){const t=[];e.effect.getKeyframes().forEach((e=>{const n=r(o,e);null!==n&&n>=0&&n<=100&&(e.offset=n/100,t.push(e))}));const n=t.sort(((e,t)=>e.offset<t.offset?-1:e.affset>t.offset?1:0));e.effect.setKeyframes(n)}}(e,o),{timeline:o.source?new ScrollTimeline(o):new $e(o),animOptions:i}):null}/* Arts 1.1.0-arts.4: CSS binding repairs. Keep this patch readable; the
 * upstream distribution above is vendored, with no source/build dependency. */
function artsSplitCSS(value, delimiter = ',') {
  const result = [];
  let start = 0, depth = 0, quote = '', escaped = false, comment = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index], next = value[index + 1];
    if (comment) { if (char === '*' && next === '/') { comment = false; index++; } continue; }
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '/' && next === '*') { comment = true; index++; continue; }
    if ('([{'.includes(char)) depth++;
    else if (')]}'.includes(char)) depth--;
    else if (!depth && (delimiter === ' ' ? /\s/.test(char) : char === delimiter)) {
      const part = value.slice(start, index).trim();
      if (part || delimiter !== ' ') result.push(part);
      start = index + 1;
    }
  }
  const part = value.slice(start).trim();
  if (part || delimiter !== ' ') result.push(part);
  return result;
}
function artsResolveVars(value, style, seen = new Set()) {
  if (seen.size > 64) return null;
  let output = '', cursor = 0;
  const pattern = /var\(/g;
  for (let match; (match = pattern.exec(value)); ) {
    let end = pattern.lastIndex, depth = 1, quote = '', escaped = false;
    for (; end < value.length && depth; end++) {
      const char = value[end];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '(') depth++;
      else if (char === ')') depth--;
    }
    if (depth) return null;
    const parts = artsSplitCSS(value.slice(pattern.lastIndex, end - 1));
    const name = parts.shift();
    if (!/^--/.test(name)) return null;
    let replacement = null;
    if (!seen.has(name)) {
      const custom = style.getPropertyValue(name).trim();
      if (custom) replacement = artsResolveVars(custom, style, new Set([...seen, name]));
    }
    if (replacement === null && parts.length) replacement = artsResolveVars(parts.join(','), style, seen);
    if (replacement === null) return null;
    output += value.slice(cursor, match.index) + replacement;
    cursor = end;
    pattern.lastIndex = end;
  }
  return output + value.slice(cursor);
}
function artsParseInset(value) {
  const parts = typeof value === 'string'
    ? artsSplitCSS(value, ' ').map(part => part === 'auto' ? part : CSSNumericValue.parse(part))
    : Array.isArray(value) ? value : [value];
  if (!parts.length || parts.length > 2) throw TypeError('Invalid inset');
  for (const part of parts) {
    if (part === 'auto') continue;
    const type = part.type();
    if (type.length !== 1 && type.percent !== 1) throw TypeError('Invalid inset');
  }
  return {start: parts[0], end: parts[1] ?? parts[0]};
}
let artsInsetCache = new WeakMap(), artsInsetCachePending = false;
function artsResolvedInset(subject, raw) {
  let cache = artsInsetCache.get(subject);
  if (!cache) {
    cache = {style: getComputedStyle(subject), values: new Map()};
    artsInsetCache.set(subject, cache);
  }
  if (!cache.values.has(raw)) cache.values.set(raw, artsResolveVars(raw, cache.style) ?? 'auto');
  if (!artsInsetCachePending) {
    artsInsetCachePending = true;
    requestAnimationFrame(() => { artsInsetCache = new WeakMap(); artsInsetCachePending = false; });
  }
  return cache.values.get(raw);
}
function artsRefreshInset(state, style) {
  const raw = state.artsInset;
  if (raw == null) return false;
  const hasVars = typeof raw === 'string' && raw.includes('var(');
  const resolved = hasVars && state.subject
    ? style ? artsResolveVars(raw, style) ?? 'auto' : artsResolvedInset(state.subject, raw)
    : raw;
  if (state.artsResolvedInset === resolved) return false;
  state.inset = artsParseInset(resolved);
  state.artsResolvedInset = resolved;
  return true;
}
const artsParserPrototype = Object.getPrototypeOf(It);
artsParserPrototype.extractMatches = function(value, pattern, delimiter = ',') {
  const match = pattern.exec(value);
  return match ? artsSplitCSS(match[1], delimiter) : [];
};
artsParserPrototype.split = function(value) { return artsSplitCSS(value, ' '); };
artsParserPrototype.extractScrollTimelineNames = function(value) {
  return this.extractMatches(value, kt.ANIMATION_TIMELINE).map(name =>
    /^(scroll|view)\(/.test(name) ? this.saveAnonymousTimelineName(name) : name);
};
artsParserPrototype.parseAnonymousViewTimeline = function(value) {
  const parts = artsSplitCSS(value.slice(value.indexOf('(') + 1, value.lastIndexOf(')')), ' ');
  const options = {}, inset = [];
  for (const part of parts) Mt.includes(part) ? options.axis = part : inset.push(part);
  if (inset.length) options.inset = inset.join(' ');
  return options;
};
artsParserPrototype.handleScrollTimelineProps = function(rule, sheet) {
  if (rule.selector.includes('@keyframes')) return;
  this.saveSourceSelectorToScrollTimeline(rule);
  this.saveSubjectSelectorToViewTimeline(rule);
  const declarations = artsSplitCSS(rule.block.contents.slice(1, -1), ';');
  let names = [], durations = [], timelines = [], important = false;
  const time = /^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?m?s$/i;
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim().replace(/\s*!important\s*$/i, '');
    if (property === 'animation') {
      timelines = ['auto'];
      important = /!important\s*$/i.test(declaration);
      const items = artsSplitCSS(value);
      durations = items.map(item => {
        const tokens = artsSplitCSS(item, ' ');
        return tokens.includes('auto') ? 'auto' : tokens.find(token => time.test(token)) ?? 'auto';
      });
      names = items.map(item => {
        const tokens = artsSplitCSS(item, ' ');
        const known = tokens.find(token => this.keyframeNamesSelectors.has(token));
        if (known) return known;
        return tokens.find(token => !time.test(token) && !/^[\d.]+$/.test(token) &&
          !/^(auto|none|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|infinite|normal|reverse|alternate|alternate-reverse|forwards|backwards|both|running|paused)$/.test(token) &&
          !/^(cubic-bezier|steps|linear)\(/.test(token))?.replace(/^(['"])(.*)\1$/, '$2') ?? 'none';
      });
    } else if (property === 'animation-name') {
      names = artsSplitCSS(value).map(name => name.replace(/^(['"])(.*)\1$/, '$2'));
    } else if (property === 'animation-duration') {
      important = /!important\s*$/i.test(declaration);
      durations = artsSplitCSS(value);
    } else if (property === 'animation-timeline') {
      timelines = this.extractScrollTimelineNames(`animation-timeline:${value};`);
    }
  }
  if (!timelines.length) return;
  // Only a scroll-bound auto/omitted duration receives the bootstrap. Explicit
  // durations (including 0s), delays, fill modes and unrelated list slots survive.
  const count = Math.max(names.length, timelines.length, durations.length);
  let changed = false;
  const normalized = Array.from({length: count}, (_, index) => {
    const duration = durations.length ? durations[index % durations.length] : 'auto';
    const timeline = timelines[index % timelines.length];
    if (timeline !== 'none' && timeline !== 'auto' && duration === 'auto') {
      changed = true;
      return '1s';
    }
    return duration === 'auto' ? '0s' : duration;
  });
  // Firefox rejects `auto` inside the shorthand as a whole. Appending the
  // duration longhand alone cannot recover the lost animation name or easing.
  let shorthandChanged = false;
  const rewritten = declarations.map(declaration => {
    const colon = declaration.indexOf(':');
    if (declaration.slice(0, colon).trim() !== 'animation') return declaration;
    const items = artsSplitCSS(declaration.slice(colon + 1)).map((item, index) => {
      const tokens = artsSplitCSS(item, ' '), auto = tokens.indexOf('auto');
      if (auto < 0) return item;
      const timeline = timelines[index % timelines.length];
      tokens[auto] = timeline !== 'none' && timeline !== 'auto' ? '1s' : '0s';
      shorthandChanged = true;
      return tokens.join(' ');
    });
    return declaration.slice(0, colon + 1) + items.join(',');
  });
  if (changed || shorthandChanged) {
    rule.block.contents = '{' + rewritten.join(';') +
      (changed ? `;animation-duration:${normalized.join(',')}${important ? '!important' : ''};` : '') + '}';
    this.replacePart(rule.block.startIndex, rule.block.endIndex, rule.block.contents, sheet);
  }
  this.saveRelationInList(rule, timelines, names);
};
// Each stylesheet owns its registrations. HMR replaces one record, and merging
// in DOM order leaves later sheets' precedence intact regardless of fetch order.
const artsSheets = new Map();
const artsBindings = new Map();
let artsAnonymousIndex = 0, artsRefreshPending = false;
function artsMergeSheets() {
  const parsers = [...artsSheets.entries()]
    .filter(([node]) => node.isConnected)
    .sort(([a], [b]) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
    .map(([, record]) => record.parser).filter(Boolean);
  for (const property of ['cssRulesWithTimelineName', 'sourceSelectorToScrollTimeline', 'subjectSelectorToViewTimeline']) {
    It[property] = parsers.flatMap(parser => parser[property]);
  }
  for (const property of ['anonymousScrollTimelineOptions', 'anonymousViewTimelineOptions', 'keyframeNamesSelectors']) {
    It[property] = new Map(parsers.flatMap(parser => [...parser[property]]));
  }
}
function artsTranspile(node, source) {
  const old = artsSheets.get(node);
  artsInsetCache = new WeakMap();
  if (old && old.skipped === ('aphrodite' in node.dataset)) {
    if (source === old.output) return;
    if (source === old.source) {
      // HMR may emit identical authored CSS again. Restore its normalized text;
      // only our own emitted output is an observer no-op.
      artsScheduleRefresh();
      return old;
    }
  }
  const record = {source, output: source, parser: null, blob: old?.blob, skipped: 'aphrodite' in node.dataset};
  const hasTimeline = /(animation-timeline|scroll-timeline|view-timeline|timeline-scope)/.test(source);
  if (!('aphrodite' in node.dataset) && (hasTimeline || /animation\s*:/.test(source))) {
    try {
      const parser = new It.constructor();
      parser.nextAnonymousTimelineNameIndex = artsAnonymousIndex;
      const firstPass = parser.transpileStyleSheet(source, true);
      const ownKeyframes = parser.keyframeNamesSelectors;
      parser.keyframeNamesSelectors = new Map([...It.keyframeNamesSelectors, ...ownKeyframes]);
      const output = parser.transpileStyleSheet(firstPass, false);
      // Time-based shorthand rules still reset earlier timeline bindings, but
      // timeline-free sheets retain their original text and href.
      record.output = hasTimeline ? output : source;
      parser.keyframeNamesSelectors = ownKeyframes;
      record.parser = parser;
      artsAnonymousIndex = parser.nextAnonymousTimelineNameIndex;
    } catch (error) { /* Preserve the package's non-fatal hostile-sheet policy. */ }
  }
  artsSheets.set(node, record);
  artsMergeSheets();
  artsScheduleRefresh();
  return record;
}
function artsDisposeTimeline(timeline) {
  if (!(timeline instanceof ScrollTimeline)) return;
  const state = ve.get(timeline);
  if (state.animations.length) return;
  for (const observer of state.artsSubjectObservers ?? []) observer.disconnect();
  Re(timeline, null);
}
function artsUnbind(animation, record, resume) {
  const state = ht.get(record.proxy);
  if (state?.timeline) {
    const timeline = state.timeline;
    Ne(timeline, animation);
    state.timeline = null;
    state.pendingTask = null;
    state.startTime = state.holdTime = null;
    state.animationRange = null;
    state.specifiedTiming = state.normalizedTiming = null;
    artsDisposeTimeline(timeline);
  }
  artsBindings.delete(animation);
  if (resume && animation.playState !== 'idle') animation.play();
}
function artsBind(animation) {
  if (!animation.animationName || !(animation.effect?.target instanceof Element)) return;
  const target = animation.effect.target;
  const prior = artsBindings.get(animation);
  if (!target.isConnected || animation.playState === 'idle') {
    if (prior) artsUnbind(animation, prior, false);
    return;
  }
  const relation = It.getAnimationTimelineOptions(animation.animationName, target);
  const name = relation?.['animation-timeline'];
  const options = name && name !== 'none' && name !== 'auto'
    ? It.getScrollTimelineOptions(name, target) || It.getViewTimelineOptions(name, target) : null;
  if (!options) {
    if (prior) artsUnbind(animation, prior, true);
    return;
  }
  let timeline = prior?.proxy.timeline;
  const reusable = options.subject ? timeline instanceof $e && timeline.subject === options.subject
    : timeline instanceof ScrollTimeline && !(timeline instanceof $e) && timeline.source === options.source;
  if (!reusable) {
    const bound = Nt(animation, animation.animationName, target);
    if (!bound) return;
    timeline = bound.timeline;
  } else {
    const timelineState = ve.get(timeline);
    timelineState.axis = options.axis ?? 'block';
    if (options.subject) {
      timelineState.artsInset = options.inset ?? 'auto';
      artsRefreshInset(timelineState);
    }
  }
  let proxy = prior?.proxy ?? pt.get(animation);
  if (!proxy) {
    proxy = new wt(animation, timeline, relation);
    animation.pause();
    proxy.play();
  } else {
    const oldTimeline = proxy.timeline;
    proxy.timeline = timeline;
    const state = ht.get(proxy);
    state.animationRange = Tt(timeline, relation['animation-range']);
    state.specifiedTiming = state.normalizedTiming = null;
    state.autoAlignStartTime = true;
    if (oldTimeline !== timeline) artsDisposeTimeline(oldTimeline);
    if (!prior) { animation.pause(); proxy.play(); }
  }
  artsBindings.set(animation, {proxy, target});
  Ie(timeline.source);
}
function artsRefreshBindings() {
  artsRefreshPending = false;
  artsMergeSheets();
  const nativeAnimations = qe.call(document);
  for (const [animation, record] of artsBindings) {
    if (!record.target.isConnected || animation.playState === 'idle') artsUnbind(animation, record, false);
  }
  for (const animation of nativeAnimations) artsBind(animation);
}
function artsScheduleRefresh() {
  if (artsRefreshPending) return;
  artsRefreshPending = true;
  requestAnimationFrame(artsRefreshBindings);
}
function At() {
  function inline(node) {
    const record = artsTranspile(node, node.textContent);
    if (record && node.textContent !== record.output) node.textContent = record.output;
  }
  function link(node) {
    if ((node.type !== 'text/css' && node.rel !== 'stylesheet') || !node.href) return;
    if ('aphrodite' in node.dataset) {
      if (artsSheets.has(node)) { artsSheets.delete(node); artsScheduleRefresh(); }
      return;
    }
    const href = node.href;
    const previous = artsSheets.get(node);
    if (previous?.blob === href || previous?.href === href || new URL(href, document.baseURI).origin !== location.origin) return;
    const marker = {href, output: '', source: '', parser: previous?.parser, blob: previous?.blob};
    artsSheets.set(node, marker);
    node.addEventListener('load', artsScheduleRefresh, {once: true});
    fetch(href).then(response => response.text()).then(source => {
      if (!node.isConnected || node.href !== href || artsSheets.get(node) !== marker) return;
      const record = artsTranspile(node, source) ?? marker;
      record.href = href;
      if (record.output !== source) {
        record.blob = URL.createObjectURL(new Blob([record.output], {type: 'text/css'}));
        node.addEventListener('load', artsScheduleRefresh, {once: true});
        node.href = record.blob;
      } else record.blob = null;
      if (previous?.blob && previous.blob !== record.blob) URL.revokeObjectURL(previous.blob);
    }).catch(() => {});
  }
  function visit(node) {
    if (node instanceof HTMLStyleElement) inline(node);
    else if (node instanceof HTMLLinkElement) link(node);
  }
  let variablesPending = false;
  const variableTargets = new Set();
  function refreshVariables() {
    variablesPending = false;
    const timelines = new Set([...artsBindings.values()].map(record => record.proxy.timeline));
    const styles = new Map(), sources = new Set();
    for (const timeline of timelines) {
      const state = ve.get(timeline), subject = state?.subject;
      if (!subject?.isConnected || typeof state.artsInset !== 'string' || !state.artsInset.includes('var(') ||
        ![...variableTargets].some(target => target.contains(subject))) continue;
      if (!styles.has(subject)) styles.set(subject, getComputedStyle(subject));
      if (artsRefreshInset(state, styles.get(subject))) sources.add(timeline.source);
    }
    variableTargets.clear();
    for (const source of sources) Ie(source);
  }
  new MutationObserver(records => {
    const changed = new Set();
    const removed = [];
    for (const record of records) {
      const element = record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
      if (element instanceof HTMLStyleElement || element instanceof HTMLLinkElement) changed.add(element);
      else if (record.type === 'attributes') {
        artsInsetCache = new WeakMap();
        variableTargets.add(element);
        if (!variablesPending) {
          variablesPending = true;
          requestAnimationFrame(refreshVariables);
        }
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          if (node.matches('style,link')) changed.add(node);
          for (const sheet of node.querySelectorAll('style,link')) changed.add(sheet);
        }
      }
      for (const node of record.removedNodes) if (node instanceof Element) removed.push(node);
    }
    for (const node of changed) if (node.isConnected) visit(node);
    if (removed.length) {
      let affected = false;
      for (const [node, record] of artsSheets) if (!node.isConnected) {
        if (record.blob) URL.revokeObjectURL(record.blob);
        artsSheets.delete(node);
        affected = true;
      }
      if (!affected) for (const record of artsBindings.values()) {
        const timeline = ve.get(record.proxy.timeline);
        if (removed.some(node => node.contains(record.target) ||
          (timeline?.subject && node.contains(timeline.subject)) ||
          (timeline?.source && node.contains(timeline.source)))) { affected = true; break; }
      }
      if (affected) artsScheduleRefresh();
    }
  }).observe(document.documentElement, {
    childList: true, characterData: true, subtree: true, attributes: true,
    attributeFilter: ['style', 'class', 'href', 'data-aphrodite']
  });
  for (const node of document.querySelectorAll('style,link')) visit(node);
  const supports = CSS.supports;
  CSS.supports = (property, value) => value === undefined
    ? supports(property.replaceAll(/(animation-timeline|scroll-timeline(-(name|axis))?|view-timeline(-(name|axis|inset))?|timeline-scope)\s*:/g, '--supported-property:'))
    : /^(animation-timeline|scroll-timeline(-(name|axis))?|view-timeline(-(name|axis|inset))?|timeline-scope)$/.test(property) || supports(property, value);
  window.addEventListener('animationstart', event => {
    for (const animation of Be.call(event.target)) if (animation.animationName === event.animationName) artsBind(animation);
  });
}

!function(){if(!At()){if(!Reflect.defineProperty(window,"ScrollTimeline",{value:ScrollTimeline}))throw Error("Error installing ScrollTimeline polyfill: could not attach ScrollTimeline to window");if(!Reflect.defineProperty(window,"ViewTimeline",{value:$e}))throw Error("Error installing ViewTimeline polyfill: could not attach ViewTimeline to window");if(!Reflect.defineProperty(Element.prototype,"animate",{value:xt}))throw Error("Error installing ScrollTimeline polyfill: could not attach WAAPI's animate to DOM Element");if(!Reflect.defineProperty(window,"Animation",{value:wt}))throw Error("Error installing Animation constructor.");if(!Reflect.defineProperty(Element.prototype,"getAnimations",{value:Ct}))throw Error("Error installing ScrollTimeline polyfill: could not attach WAAPI's getAnimations to DOM Element");if(!Reflect.defineProperty(document,"getAnimations",{value:Et}))throw Error("Error installing ScrollTimeline polyfill: could not attach WAAPI's getAnimations to document")}}()}();
//# sourceMappingURL=scroll-timeline.js.map
}
