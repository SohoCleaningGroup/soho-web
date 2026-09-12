export type BusinessCard = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  website: string;
  instagram: string;
  phone: string;
  email: string;
};

export const businessCards: Record<string, BusinessCard> = {
  andy: {
    slug: "andy",
    name: "Andy Vargas",
    title: "Founder",
    bio: "Premium residential cleaning services across Manhattan with trusted professionals and white-glove care.",
    image: "/images/cards/andy.jpg",
    website: "https://sohocleaninggroup.com",
    instagram: "https://instagram.com/sohocleaninggroup",
    phone: "+16465300590",
    email: "andy@sohocleaninggroup.com",
  },
};