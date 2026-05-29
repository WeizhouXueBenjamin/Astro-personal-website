import AboutIcon from "../assets/AboutIcon.astro";
import BlogIcon from "../assets/BlogIcon.astro";
import GalleryIcon from "../assets/GalleryIcon.astro";
import HomeIcon from "../assets/HomeIcon.astro";
import WorkIcon from "../assets/WorkIcon.astro";

export const components: {
  title: string;
  href: string;
  description: string;
  icon: any;
}[] = [
  {
    title: "Home",
    href: "/",
    description: "Return to the homepage.",
    icon: HomeIcon,
  },
  {
    title: "About",
    href: "/about",
    description: "Learn more about me and my work.",
    icon: AboutIcon,
  },
  {
    title: "Work",
    href: "/work",
    description: "Explore my portfolio and projects.",
    icon: WorkIcon,
  },
  {
    title: "Blog",
    href: "/blog",
    description: "Read my latest articles and insights.",
    icon: BlogIcon,
  },
  {
    title: "Gallery",
    href: "/gallery",
    description: "View my latest photos and artwork.",
    icon: GalleryIcon,
  },
];
