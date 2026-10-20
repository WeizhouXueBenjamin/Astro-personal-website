import AboutIcon from "../assets/AboutIcon.astro";
import BlogIcon from "../assets/BlogIcon.astro";
import HomeIcon from "../assets/HomeIcon.astro";
import WorkIcon from "../assets/WorkIcon.astro";

export interface NavigationItem {
  title: string;
  href: string;
  description: string;
  icon: typeof HomeIcon;
}

export const components: NavigationItem[] = [
  {
    title: "Home",
    href: "/",
    description: "Return to the homepage.",
    icon: HomeIcon,
  },
  {
    title: "About",
    href: "/about",
    description: "Explore my background, experience, and engineering focus.",
    icon: AboutIcon,
  },
  {
    title: "Projects",
    href: "/projects",
    description: "Explore PLC/SCADA, automation, and software projects.",
    icon: WorkIcon,
  },
  {
    title: "Blog",
    href: "/blog",
    description: "Read my latest articles and insights.",
    icon: BlogIcon,
  },
];
