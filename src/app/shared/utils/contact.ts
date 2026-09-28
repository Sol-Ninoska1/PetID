export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

const digits = (phone: string) => phone.replace(/\D/g, '');

export const telHref = (phone: string) => `tel:+${digits(phone)}`;

export const whatsappHref = (phone: string, text: string) =>
  `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;

export const mapsHref = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
