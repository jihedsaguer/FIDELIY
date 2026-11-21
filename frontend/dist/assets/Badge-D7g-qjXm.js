import{i as e,n as t,t as n}from"./jsx-runtime-DyZJNswf.js";import{i as r}from"./index-DdJGFrPI.js";var i=e(t(),1),a=n(),o=`
  w-full
  bg-[var(--surface)]
  border border-[var(--border)]
  rounded-[var(--radius-lg)]
  px-3 py-2
  text-sm
  text-[var(--text)]
  placeholder:text-[var(--text-muted)]
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-0
  disabled:cursor-not-allowed disabled:opacity-50
`,s={default:``,ghost:`bg-transparent border-0 focus:ring-0`},c={error:`border-[var(--danger)] focus:ring-[var(--danger)] focus:border-[var(--danger)]`,success:`border-[var(--success)] focus:ring-[var(--success)] focus:border-[var(--success)]`},l=`absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)]`,u=(0,i.forwardRef)(({className:e,variant:t=`default`,error:n=!1,success:i=!1,leftIcon:u,rightIcon:d,label:f,hint:p,type:m=`text`,id:h,...g},_)=>{let v=n,y=!n&&i,b=h||g.name;return(0,a.jsxs)(`div`,{className:`w-full`,children:[f&&(0,a.jsx)(`label`,{htmlFor:b,className:`block text-[var(--text)] text-sm font-medium mb-2`,children:f}),(0,a.jsxs)(`div`,{className:`relative`,children:[u&&(0,a.jsx)(`div`,{className:r(l,`left-3`),children:u}),(0,a.jsx)(`input`,{ref:_,type:m,id:b,className:r(o,s[t],v&&c.error,y&&c.success,u&&`pl-10`,d&&`pr-10`,e),"aria-invalid":v,"aria-describedby":v?`${b}-error`:p?`${b}-hint`:void 0,...g}),d&&(0,a.jsx)(`div`,{className:r(l,`right-3`),children:d})]}),p&&!v&&(0,a.jsx)(`p`,{className:`text-[var(--text-muted)] text-xs mt-1`,children:p}),v&&(0,a.jsx)(`p`,{className:`text-[var(--danger)] text-xs mt-1`,id:`${b}-error`,children:g[`aria-errormessage`]})]})});u.displayName=`Input`;var d={default:`bg-[var(--subtle)] text-[var(--text-muted)]`,primary:`bg-[var(--glass-brand)] text-[var(--brand)]`,secondary:`bg-[var(--subtle)] text-[var(--text)]`,success:`bg-[var(--success-light)] text-[var(--success)]`,warning:`bg-[var(--warning-light)] text-[var(--warning)]`,danger:`bg-[var(--danger-light)] text-[var(--danger)]`,info:`bg-[var(--info-light)] text-[var(--info)]`,brand:`bg-[var(--glass-brand)] text-[var(--brand)]`},f={sm:`px-2 py-0.5 text-xs`,md:`px-2.5 py-0.5 text-sm`,lg:`px-3 py-1 text-sm`},p=`
  inline-flex items-center gap-1.5
  font-semibold rounded-full
`,m=`w-1.5 h-1.5 rounded-full`,h={default:`bg-[var(--text-muted)]`,primary:`bg-[var(--brand)]`,secondary:`bg-[var(--text)]`,success:`bg-[var(--success)]`,warning:`bg-[var(--warning)]`,danger:`bg-[var(--danger)]`,info:`bg-[var(--info)]`,brand:`bg-[var(--brand)]`},g=(0,i.forwardRef)(({className:e,variant:t=`default`,size:n=`md`,dot:i=!1,children:o,...s},c)=>(0,a.jsxs)(`span`,{ref:c,className:r(p,d[t],f[n],e),...s,children:[i&&(0,a.jsx)(`span`,{className:r(m,h[t]),"aria-hidden":`true`}),o]}));g.displayName=`Badge`;export{u as n,g as t};