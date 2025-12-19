import { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function Panel({ title, subtitle, children }: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="eyebrow">{title}</p>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <span className="pill ghost">Placeholder</span>
      </div>
      {children}
    </section>
  );
}
