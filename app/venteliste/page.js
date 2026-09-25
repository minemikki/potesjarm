import Landing from "../components/Landing";

// Viser alltid ventelisten – også på Preview, der rota viser appen. Nyttig for
// å se og teste siden før den går ut. Kanonisk adresse er forsiden.
export const metadata = {
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

export default function Venteliste() {
  return <Landing />;
}
