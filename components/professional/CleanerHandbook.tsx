type Section = { readonly id: string; readonly title: string; readonly points: readonly string[] };

export default function CleanerHandbook({ sections, version, cleanerName, spanish = false }: { sections: readonly Section[]; version: string; cleanerName?: string; spanish?: boolean }) {
  const name = cleanerName?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const otherLanguage = spanish ? "/professional/handbook" : "/professional/handbook/es";
  const otherLanguageHref = name ? `${otherLanguage}?name=${encodeURIComponent(name)}` : otherLanguage;
  return <main lang={spanish ? "es" : "en"} className="min-h-screen bg-[#060606] px-5 py-12 text-white print:bg-white print:text-black">
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-[0.2em] text-[#d6ab5f] print:text-black">SoHo Cleaning Group</p>
        <a href={otherLanguageHref} hrefLang={spanish ? "en" : "es"} className="rounded-xl border border-[#8f6b2f] px-4 py-2 text-sm underline underline-offset-4 print:hidden">{spanish ? "Read in English" : "Leer en español"}</a>
      </div>
      <h1 className="mt-5 font-serif text-4xl sm:text-5xl">{spanish ? "Tu manual de limpieza" : "Your cleaner handbook"}</h1>
      {name && <p className="mt-3 text-[#d6ab5f] print:text-black">{spanish ? "Preparado para" : "Prepared for"} {name}</p>}
      <p className="mt-5 text-lg leading-8 text-[#e8dfce] print:text-black">{spanish ? "Una cálida bienvenida, un plan claro y el cuidado que hace que un hogar se sienta limpio y acogedor." : "A warm welcome, a clear plan, and the care that makes a home feel fresh."}</p>
      <p className="mt-3 text-sm text-[#cfc7b7] print:text-black">{spanish ? `Actualizado el ${version}. Ten esta guía a mano y consulta con SoHo cuando necesites ayuda.` : `Updated ${version}. Keep this guide handy and ask SoHo whenever you need help.`}</p>
      <nav aria-label={spanish ? "Secciones del manual" : "Handbook sections"} className="my-8 rounded-2xl border border-[#8f6b2f] p-6">
        <h2 className="mb-4 text-xl text-[#d6ab5f] print:text-black">{spanish ? "En esta guía" : "In this guide"}</h2>
        <ol className="grid list-inside list-decimal gap-3 sm:grid-cols-2">
          {sections.map(section => <li key={section.id}><a className="underline decoration-[#8f6b2f] underline-offset-4" href={`#${section.id}`}>{section.title}</a></li>)}
        </ol>
      </nav>
      <div className="grid gap-6">
        {sections.map((section, index) => <section key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl border border-[#3a2812] bg-[#0a0a0a] p-6 sm:p-8 print:break-inside-avoid print:bg-white">
          <h2 className="font-serif text-2xl text-[#e3bd74] print:text-black">{index + 1}. {section.title}</h2>
          <ul className="mt-5 list-disc space-y-4 pl-5 text-base leading-8 text-[#e8dfce] print:text-black">{section.points.map(point => <li key={point}>{name ? point.replace(spanish ? "[nombre]" : "[name]", name) : point}</li>)}</ul>
        </section>)}
      </div>
      <p className="mt-8 text-sm leading-7 text-[#cfc7b7] print:text-black">{spanish ? "Si necesitas ayuda con tu servicio, responde al correo de asignación o de aprobación de SoHo. Estamos aquí para apoyarte." : "For help with your assignment, reply to your SoHo job or approval email. We’re here to support you."}</p>
    </div>
  </main>;
}
