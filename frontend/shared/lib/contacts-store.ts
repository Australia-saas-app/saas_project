import { getAllAdminUsers } from "@/src/shared/lib/admin-users-store";
import { DEMO_ACCOUNTS } from "@/src/shared/constants/demo-accounts";

export interface RegisteredContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatar?: string;
}

const DEFAULT_SEEDED_CONTACTS: RegisteredContact[] = [
  {
    id: "contact-support",
    name: "Customer Support & Escrow",
    email: "support@saas.com",
    role: "Support",
  },
];

const CUSTOM_CONTACTS_KEY = "registered_custom_email_contacts";

function readCustomContacts(): RegisteredContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomContact(contact: {
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  id?: string;
}): RegisteredContact {
  const existing = readCustomContacts();
  const found = existing.find(
    (c) => c.email.toLowerCase() === contact.email.toLowerCase()
  );
  if (found) return found;

  const newContact: RegisteredContact = {
    id: contact.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: contact.name || contact.email.split("@")[0],
    email: contact.email.trim().toLowerCase(),
    phone: contact.phone,
    role: contact.role || "User",
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        CUSTOM_CONTACTS_KEY,
        JSON.stringify([newContact, ...existing])
      );
    } catch {
      // ignore
    }
  }

  return newContact;
}

export const registerContact = saveCustomContact;

export function getAllRegisteredContacts(): RegisteredContact[] {
  const contactsMap = new Map<string, RegisteredContact>();

  // 1. Add default seeded registered contacts
  DEFAULT_SEEDED_CONTACTS.forEach((c) => {
    contactsMap.set(c.email.toLowerCase(), c);
  });

  // 2. Add demo accounts
  Object.values(DEMO_ACCOUNTS).forEach((demo) => {
    const email = demo.email.toLowerCase();
    if (!contactsMap.has(email)) {
      contactsMap.set(email, {
        id: `demo-${demo.type}`,
        name: demo.label,
        email: demo.email,
        role: demo.type.charAt(0).toUpperCase() + demo.type.slice(1),
      });
    }
  });

  // 3. Add admin store registered accounts
  try {
    const adminUsers = getAllAdminUsers();
    adminUsers.forEach((u) => {
      const email = (u.email || "").toLowerCase();
      if (email && !contactsMap.has(email)) {
        contactsMap.set(email, {
          id: u.id,
          name: u.name || email.split("@")[0],
          email: u.email,
          role: u.role,
        });
      }
    });
  } catch {
    // ignore
  }

  // 4. Add custom contacts from localStorage
  readCustomContacts().forEach((c) => {
    const email = c.email.toLowerCase();
    if (!contactsMap.has(email)) {
      contactsMap.set(email, c);
    }
  });

  return Array.from(contactsMap.values());
}

export function searchRegisteredContacts(query: string): RegisteredContact[] {
  const q = query.trim().toLowerCase();
  const all = getAllRegisteredContacts();
  if (!q) return all.slice(0, 10);

  return all
    .filter((contact) => {
      const email = contact.email.toLowerCase();
      const name = contact.name.toLowerCase();
      // Match anywhere: starts with, middle, ends with in email or name
      return email.includes(q) || name.includes(q);
    })
    .sort((a, b) => {
      const aEmail = a.email.toLowerCase();
      const bEmail = b.email.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact match first
      if (aEmail === q) return -1;
      if (bEmail === q) return 1;

      // Starts with in email
      const aStartsEmail = aEmail.startsWith(q);
      const bStartsEmail = bEmail.startsWith(q);
      if (aStartsEmail && !bStartsEmail) return -1;
      if (!aStartsEmail && bStartsEmail) return 1;

      // Starts with in name
      const aStartsName = aName.startsWith(q);
      const bStartsName = bName.startsWith(q);
      if (aStartsName && !bStartsName) return -1;
      if (!aStartsName && bStartsName) return 1;

      // Substring match in email
      const aEmailIndex = aEmail.indexOf(q);
      const bEmailIndex = bEmail.indexOf(q);
      if (aEmailIndex !== -1 && bEmailIndex !== -1) {
        return aEmailIndex - bEmailIndex;
      }

      return aName.localeCompare(bName);
    });
}

export function findContactByEmail(email?: string): RegisteredContact | undefined {
  if (!email || !email.trim()) return undefined;
  const q = email.trim().toLowerCase();
  return getAllRegisteredContacts().find((c) => c.email.toLowerCase() === q);
}

export function resolveContactFullName(email?: string, fallbackName?: string): string {
  if (!email && !fallbackName) return "Unknown";
  if (fallbackName && fallbackName !== email) return fallbackName;
  const contact = findContactByEmail(email);
  if (contact?.name) return contact.name;
  if (fallbackName) return fallbackName;
  if (email) {
    const username = email.split("@")[0];
    return username
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "Unknown";
}

