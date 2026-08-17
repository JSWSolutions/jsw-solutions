import Link from "next/link";
import { Logo } from "@/components/Logo";

const AVAILABLE_FOR = [
  "Ongoing maintenance support",
  "Preventative maintenance (P.M.) services",
  "Equipment troubleshooting",
];

const MISSION_PILLARS = [
  {
    title: "Maximum Uptime",
    body: "We support production equipment to maintain high uptime, and promote predictive services that maintain high reliability — catching problems before they interrupt production.",
  },
  {
    title: "Deep Technical Experience",
    body: "Our team brings over 30 years of hands-on experience servicing CNC equipment — pneumatic and hydraulic systems, schematic reading, and P.M. services across a wide range of machines.",
  },
  {
    title: "Building Capable Teams",
    body: "We support on-site maintenance teams with training and hands-on evaluations, helping build a highly reliable and capable team inside your own facility.",
  },
];

const WHY_POINTS = [
  "Consistent support for existing maintenance teams",
  "Preventative maintenance & predictive services",
  "Industrial laser & CNC specialists",
  "Training & hands-on team evaluations",
  "Local company based in Saline, Michigan",
];

const STATS = [
  { value: "30+", label: "Years of hands-on technician experience" },
  { value: "2023", label: "Proudly serving manufacturers since" },
  { value: "Saline, MI", label: "Locally owned & operated" },
];

const TEAM = [
  {
    name: "Jerry Couturier",
    title: "Founder & Senior Service Technician",
    initials: "JC",
    photo: "/jerry.jpg",
    paragraphs: [
      "Jerry Couturier is the founder of JSW Solutions and an eight-year U.S. Army veteran who has worked on high-security contracts. He brings over 30 years of industrial maintenance and field service experience, including more than 20 years specializing in Mitsubishi laser and CNC systems. Since 1994, he has supported manufacturers through preventative maintenance, troubleshooting, repairs, equipment installation, and production support.",
      "His experience includes industrial laser systems, CNC lathes and mills, servo drives, robot welding equipment, hydraulic and pneumatic systems, electrical controls, and industrial automation equipment. Throughout his career, Jerry has built a reputation for solving complex machine issues and helping manufacturers minimize downtime.",
      "Jerry has completed specialized training with industry-leading manufacturers and automation providers, including Mitsubishi Electric, Mori Seiki, GE Fanuc, Siemens, Allen-Bradley, and Control Laser Corporation. His training includes CNC maintenance, advanced laser systems, PLCs, servo systems, industrial hydraulics, and machine tool repair.",
      "He holds an Associate Degree in Electronic Engineering from ITT Technical Institute and graduated with distinction in both Electronics & Repair and Leadership & Management. His combination of factory training and decades of hands-on experience provides JSW Solutions customers with dependable expertise when reliability matters most.",
    ],
  },
  {
    name: "Marcel Couturier",
    title: "Co-owner | JSW Solutions",
    initials: "MC",
    photo: "/marcel.jpg",
    paragraphs: [
      "Marcel has over 3 years of experience working with industrial laser and CNC equipment, providing maintenance support, troubleshooting, and service throughout Southeast Michigan.",
      "Marcel earned a Bachelor of Business Administration from the Eastern Michigan University College of Business and focuses on customer relationships, project coordination, and ensuring clients receive responsive and dependable service. His goal is to build long term partnerships with manufacturers by providing practical solutions and reliable support.",
    ],
  },
  {
    name: "Mark Blair",
    title: "Training & PLC Solutions Partner",
    initials: "MB",
    photo: "/mark.jpg",
    paragraphs: [
      "Mark Blair is the owner of National Corporate Training Solutions, an eight-year U.S. Army veteran, and brings over 40 years of experience in industrial automation, controls engineering, maintenance, and technical training.",
      "Mark specializes in electrical systems, motor controls, PLC programming, industrial troubleshooting, and workforce development. His expertise includes Allen-Bradley and Siemens PLC platforms, VFDs, HMIs, control panel design, industrial electrical systems, and maintenance training.",
      "Through our partnership with Mark and National Corporate Training Solutions, JSW Solutions can connect customers with customized technical training, PLC support, and workforce development designed to improve troubleshooting skills, increase productivity, and reduce equipment downtime.",
    ],
  },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-20 bg-sand/90 backdrop-blur border-b border-black/5">
      <div className="container-page flex flex-wrap items-center justify-between gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-14 w-auto md:h-16" />
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-ink md:gap-8 md:text-base">
          <a href="#about" className="hover:text-brand-orange">About us</a>
          <a href="#services" className="hover:text-brand-orange">Services</a>
          <a href="#why" className="hover:text-brand-orange">Why us?</a>
          <a href="#team" className="hover:text-brand-orange">Our team</a>
          <Link
            href="/pay"
            className="rounded-lg bg-brand-orange px-4 py-2 text-white hover:bg-brand-orange-dark"
          >
            Pay an Invoice
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <style>{`html{scroll-behavior:smooth}`}</style>
      <NavBar />

      {/* HERO */}
      <section id="home" className="scroll-mt-24">
        <div className="container-page pt-16 pb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-green-dark">
            Saline, Michigan · Serving Metro Detroit
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Industrial Laser &amp; CNC Maintenance
          </h1>
          <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-snug text-ink/80 md:text-3xl">
            Keeping Southeast Michigan manufacturing running.
          </h2>
          <p className="mt-6 text-xl font-bold text-brand-orange md:text-2xl">
            Your Maintenance Team&apos;s Trusted Partner
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink/90">
            Whether you&apos;re looking for a reliable partner to support your
            existing maintenance department or extra experienced hands for
            P.M. services, we keep your equipment running and your downtime to
            a minimum.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="mailto:jsawsolutions@gmail.com"
              className="rounded-lg bg-brand-green px-6 py-3 font-semibold text-white shadow-md hover:bg-brand-green-dark"
            >
              Email our team
            </a>
          </div>

          {/* STATS */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-black/5 bg-white/70 p-5 text-center shadow-sm"
              >
                <p className="text-3xl font-extrabold text-brand-green-dark">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-ink/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / MISSION */}
      <section id="about" className="scroll-mt-24 border-y border-black/5 bg-white/40">
        <div className="container-page py-14">
          <h2 className="text-3xl font-extrabold md:text-4xl">About Us</h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink/90">
            At JSW Solutions, we pride ourselves on delivering standard-setting
            technical support and maintenance services for industrial
            manufacturers. Our goal is to support production equipment to
            maintain high uptime, and to promote predictive services that
            maintain high reliability.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {MISSION_PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="h-1.5 w-12 rounded-full bg-brand-orange" />
                <h3 className="mt-3 text-xl font-bold text-brand-green-dark">
                  {p.title}
                </h3>
                <p className="mt-2 leading-relaxed text-ink/80">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="scroll-mt-24">
        <div className="container-page py-14">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            How We Can Help
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-ink/90">
            From scheduled preventative maintenance to day-to-day production
            support, our technicians are available for:
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_FOR.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-black/5 bg-white/70 px-4 py-3 shadow-sm"
              >
                <span className="mt-0.5 font-bold text-brand-green">✓</span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="scroll-mt-24 border-y border-black/5 bg-white/40">
        <div className="container-page py-14">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            Why JSW Solutions?
          </h2>
          <div className="mt-6 grid gap-10 lg:grid-cols-2">
            <div className="space-y-4 text-lg leading-relaxed text-ink/90">
              <p>
                Many facilities have capable maintenance teams but occasionally
                need additional support, specialized expertise, or extra
                manpower during busy periods. JSW Solutions works alongside
                your existing maintenance staff to help keep production moving.
              </p>
              <p>
                Our focus is proactive: predictive and preventative services
                that catch problems before they interrupt production, keeping
                your equipment reliable and your uptime high.
              </p>
              <p>
                And because a strong in-house team is your best defense against
                downtime, we offer training and hands-on evaluations to help
                build a highly reliable and capable maintenance crew.
              </p>
            </div>
            <ul className="space-y-3 self-start rounded-xl border border-black/5 bg-white p-6 shadow-sm text-lg">
              {WHY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1 font-bold text-brand-green">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="scroll-mt-24">
        <div className="container-page py-14">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            Experience You Can Count On
          </h2>
          <div className="mt-10 space-y-10">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border border-black/5 bg-white/70 p-6 shadow-sm md:p-8"
              >
                <div className="flex flex-col gap-6 md:flex-row md:gap-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="h-56 w-56 shrink-0 rounded-xl object-cover shadow-md md:h-64 md:w-64"
                  />
                  <div>
                    <h3 className="text-2xl font-bold text-brand-orange md:text-3xl">
                      {member.name}
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-brand-green-dark">
                      {member.title}
                    </p>
                    <div className="mt-4 space-y-3 leading-relaxed text-ink/90">
                      {member.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <p className="max-w-3xl italic text-ink/80">
              Together, our team provides a unique combination of industrial
              maintenance experience, laser and CNC expertise, business
              support, PLC resources, and technical training solutions for
              manufacturers throughout Southeast Michigan.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-black/10 bg-sand-dark/40">
        <div className="container-page py-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <Logo className="h-14 w-auto" />
              <h3 className="mt-4 text-xl font-bold text-brand-orange">
                Contact Us
              </h3>
              <p className="mt-2 text-ink/90">JSW Solutions LLC</p>
              <p className="text-ink/90">1151 Bishop Rd, Saline MI 48176</p>
              <p className="mt-1 text-ink/90">
                Email:{" "}
                <a
                  className="text-brand-green-dark underline"
                  href="mailto:jsawsolutions@gmail.com"
                >
                  jsawsolutions@gmail.com
                </a>
              </p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <a
                href="mailto:jsawsolutions@gmail.com"
                className="rounded-lg bg-brand-green px-5 py-2.5 font-semibold text-white hover:bg-brand-green-dark"
              >
                Email our team
              </a>
              <Link
                href="/pay"
                className="rounded-lg bg-brand-orange px-5 py-2.5 font-semibold text-white hover:bg-brand-orange-dark"
              >
                Pay an Invoice
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
