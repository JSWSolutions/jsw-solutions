import Link from "next/link";
import { Logo } from "@/components/Logo";

const AVAILABLE_FOR = [
  "Ongoing maintenance support",
  "Preventative maintenance programs",
  "Planned shutdowns",
  "Vacation and staffing coverage",
  "Equipment troubleshooting",
  "Emergency service calls",
];

const WHY_POINTS = [
  "Consistent support for existing maintenance teams",
  "On-call emergency repair services",
  "Preventative maintenance programs",
  "Industrial laser & CNC specialists",
  "Local company based in Saline, Michigan",
];

const TEAM = [
  {
    name: "Jerry Couturier",
    title: "Senior Service Technician",
    initials: "JC",
    photo: "/jerry.jpg",
    paragraphs: [
      "Jerry Couturier brings over 30 years of industrial maintenance and field service experience, including more than 20 years specializing in Mitsubishi laser and CNC systems. Since 1994, he has supported manufacturers through preventative maintenance, troubleshooting, repairs, equipment installation, and production support.",
      "His experience includes industrial laser systems, CNC lathes and mills, servo drives, robot welding equipment, hydraulic and pneumatic systems, electrical controls, and industrial automation equipment. Throughout his career, Jerry has built a reputation for solving complex machine issues and helping manufacturers minimize downtime.",
      "Jerry has completed specialized training with industry-leading manufacturers and automation providers, including Mitsubishi Electric, Mori Seiki, GE Fanuc, Siemens, Allen-Bradley, and Control Laser Corporation. His training includes CNC maintenance, advanced laser systems, PLCs, servo systems, industrial hydraulics, and machine tool repair.",
      "He holds an Associate Degree in Electronic Engineering from ITT Technical Institute and graduated with distinction in both Electronics & Repair and Leadership & Management programs. His combination of factory training and decades of hands-on experience provides JSW Solutions customers with dependable expertise when reliability matters most.",
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
      "Mark Blair is the owner of National Corporate Training Solutions and brings over 40 years of experience in industrial automation, controls engineering, maintenance, and technical training.",
      "Mark specializes in electrical systems, motor controls, PLC programming, industrial troubleshooting, and workforce development. His expertise includes Allen-Bradley and Siemens PLC platforms, VFDs, HMIs, control panel design, industrial electrical systems, and maintenance training.",
      "Through our partnership with Mark and National Corporate Training Solutions, JSW Solutions can connect customers with customized technical training, PLC support, and workforce development programs designed to improve troubleshooting skills, increase productivity, and reduce equipment downtime.",
    ],
  },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-20 bg-sand/90 backdrop-blur border-b border-black/5">
      <div className="container-page flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-11 w-auto" />
          <span className="hidden sm:block text-brand-green-dark font-bold tracking-wide">
            JERRY&apos;S SOLAR AND WIND SOLUTIONS
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-ink font-medium">
          <a href="#home" className="hover:text-brand-orange">Home</a>
          <a href="#about" className="hover:text-brand-orange">About us</a>
          <a href="#why" className="hover:text-brand-orange">Why us?</a>
          <a href="#team" className="hover:text-brand-orange">Service team</a>
        </nav>
      </div>
    </header>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg bg-brand-green text-3xl font-extrabold text-sand shadow-md">
      {initials}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <NavBar />

      {/* HERO */}
      <section id="home" className="container-page pt-14 pb-8">
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
          Industrial Laser &amp; CNC Maintenance
        </h1>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-snug">
          Keeping Southeast Michigan Manufacturing Running
        </h2>
        <p className="mt-6 text-2xl font-bold text-brand-orange">
          Your Maintenance Team&apos;s Trusted Partner
        </p>
        <div className="mt-5 max-w-3xl space-y-4 text-lg text-ink/90">
          <p>
            Based in Saline, Michigan, JSW Solutions provides industrial laser
            and CNC maintenance services throughout the Metro Detroit area.
          </p>
          <p>
            Whether you&apos;re looking for a reliable maintenance partner to
            support your existing maintenance department or need experienced
            technicians available for emergency repairs, we help keep your
            equipment running and your downtime to a minimum.
          </p>
          <p className="font-semibold">Available for:</p>
          <ul className="list-disc space-y-1 pl-6">
            {AVAILABLE_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="container-page py-10">
        <p className="max-w-3xl text-lg text-ink/90">
          At JSW Solutions, we pride ourselves on delivering standard-setting
          technical support and maintenance services for industrial
          manufacturers. Our team of skilled technicians is dedicated to
          ensuring your machinery operates at peak efficiency.
        </p>
      </section>

      {/* WHY */}
      <section id="why" className="container-page py-10">
        <h2 className="text-4xl font-extrabold">Why JSW Solutions?</h2>
        <div className="mt-5 max-w-3xl space-y-4 text-lg text-ink/90">
          <p>
            Many facilities have capable maintenance teams but occasionally need
            additional support, specialized expertise, or extra manpower during
            busy periods. JSW Solutions works alongside your existing
            maintenance staff to help keep production moving.
          </p>
          <p>
            When unexpected breakdowns occur, we&apos;re also available to
            provide responsive troubleshooting and repair support to get your
            equipment back online as quickly as possible.
          </p>
        </div>
        <ul className="mt-6 space-y-2 text-lg">
          {WHY_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span className="mt-1 text-brand-green font-bold">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* TEAM */}
      <section id="team" className="container-page py-10">
        <h2 className="text-4xl font-extrabold">Experience You Can Count On</h2>
        <div className="mt-8 space-y-12">
          {TEAM.map((member) => (
            <div key={member.name} className="flex flex-col gap-6 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.photo}
                alt={member.name}
                className="h-40 w-40 shrink-0 rounded-lg object-cover shadow-md"
              />
              <div>
                <h3 className="text-2xl font-bold text-brand-orange">
                  {member.name}
                </h3>
                <p className="font-semibold text-brand-green-dark">
                  {member.title}
                </p>
                <div className="mt-3 space-y-3 text-ink/90">
                  {member.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <p className="max-w-3xl italic text-ink/80">
            Together, our team provides a unique combination of industrial
            maintenance experience, laser and CNC expertise, business support,
            PLC resources, and technical training solutions for manufacturers
            throughout Southeast Michigan.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-black/10 bg-sand-dark/40">
        <div className="container-page py-10">
          <Logo className="h-14 w-auto" />
          <h3 className="mt-4 text-xl font-bold text-brand-orange">Contact Us</h3>
          <p className="mt-2 text-ink/90">
            JSW Solutions LLC &nbsp;·&nbsp; Mailing Address: 1151 Bishop Rd,
            Saline MI 48176 &nbsp;·&nbsp; Email:{" "}
            <a
              className="text-brand-green-dark underline"
              href="mailto:jsawsolutions@gmail.com"
            >
              jsawsolutions@gmail.com
            </a>
          </p>
          <p className="mt-1 text-ink/70">Phone: 734-320-6348</p>
        </div>
      </footer>
    </div>
  );
}
