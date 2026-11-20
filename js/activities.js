(() => {
  const sections=[...document.querySelectorAll('.activity-screen')];
  const nav=[...document.querySelectorAll('.activity-dot')];
  const io = new IntersectionObserver(entries => entries.forEach(e=>{
    if(e.isIntersecting){
      const i=sections.indexOf(e.target);
      nav.forEach((d,j)=>d.classList.toggle('is-active',i===j));
    }
  }),{threshold:.55});
  sections.forEach(s=>io.observe(s));
  nav.forEach((d,i)=>d.addEventListener('click',()=>sections[i].scrollIntoView({behavior:'smooth'})));
})();
