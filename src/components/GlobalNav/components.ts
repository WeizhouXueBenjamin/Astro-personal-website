import AboutIcon from "../assets/AboutIcon.astro";
import BlogIcon from "../assets/BlogIcon.astro";
import HomeIcon from "../assets/HomeIcon.astro";
import WorkIcon from "../assets/WorkIcon.astro";

export interface NavigationItem {
  title: string;
  href: string;
  icon: typeof HomeIcon;
}

export const components: NavigationItem[] = [
  {
    title: "Home",
    href: "/",
    icon: HomeIcon,
  },
  {
    title: "About",
    href: "/about/",
    icon: AboutIcon,
  },
  {
    title: "Projects",
    href: "/projects/",
    icon: WorkIcon,
  },
  {
    title: "Blog",
    href: "/blog/",
    icon: BlogIcon,
  },
];
