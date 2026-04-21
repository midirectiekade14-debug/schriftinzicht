function r(a,n){return{role:"button",tabIndex:0,"aria-expanded":n?.expanded,"aria-label":n?.label,onClick:a,onKeyDown:e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),a(e))}}}export{r as c};
