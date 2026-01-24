import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ListingGrid } from "@/components/ListingGrid";
import { Marquee } from "@/components/Marquee";
import { BentoGrid } from "@/components/BentoGrid";
import { FAQ } from "@/components/FAQ";
import { Preloader } from "@/components/Preloader";
import { ReserveCursor } from "@/components/ReserveCursor";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-950 text-white selection:bg-gold-500/30">
      <Preloader />
      <ReserveCursor />
      <Navbar />
      <Hero />
      <Marquee />
      <ListingGrid />
      <BentoGrid />
      <FAQ />
      <Footer />
    </main>
  );
}
