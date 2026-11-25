import { redirect } from 'next/navigation';

/** Eski "Bilet Al" linkleri kayıt formuna yönlenir. */
export default function TicketsRedirect() {
  redirect('/register');
}
