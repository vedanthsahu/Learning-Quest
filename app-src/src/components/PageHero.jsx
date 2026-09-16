export default function PageHero({ eyebrow, title, description, children, accent = "#bcf588" }) {
  return <header className="page-hero" style={{ "--page-accent": accent }}>
    <div className="page-hero-copy"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {children && <div className="page-hero-art">{children}</div>}
  </header>;
}
