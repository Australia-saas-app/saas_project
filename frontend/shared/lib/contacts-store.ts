import axiosInstance from "@/src/lib/axiosInstance";

export interface RegisteredContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatar?: string;
}

const DB_CONTACTS_KEY = "platform_db_registered_contacts";
const CUSTOM_CONTACTS_KEY = "registered_custom_email_contacts";

let inMemoryDbContacts: RegisteredContact[] = [];

function readCachedDbContacts(): RegisteredContact[] {
  if (typeof window === "undefined") return inMemoryDbContacts;
  try {
    const raw = localStorage.getItem(DB_CONTACTS_KEY);
    if (!raw) return inMemoryDbContacts;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryDbContacts = parsed;
      return parsed;
    }
  } catch {}
  return inMemoryDbContacts;
}

function writeCachedDbContacts(contacts: RegisteredContact[]) {
  inMemoryDbContacts = contacts;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DB_CONTACTS_KEY, JSON.stringify(contacts));
  } catch {}
}

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

/**
 * Fetch all registered users and admins from the live Database without restrictions
 */
export async function fetchRegisteredContactsFromDB(search?: string): Promise<RegisteredContact[]> {
  try {
    let res: any = null;
    const qParam = search ? `?search=${encodeURIComponent(search.trim())}` : "";

    try {
      res = await axiosInstance.get(`/sso/auth/contacts${qParam}`);
    } catch {
      try {
        res = await axiosInstance.get(`/auth/contacts${qParam}`);
      } catch {
        try {
          res = await axiosInstance.get(`/admin-service/users${qParam}`);
        } catch {
          try {
            res = await axiosInstance.get(`/sso/auth/admin/users${qParam}`);
          } catch {}
        }
      }
    }

    const data = res?.data?.data || res?.data || res;
    const userList: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.users)
      ? data.users
      : Array.isArray(data?.items)
      ? data.items
      : [];

    if (userList.length > 0) {
      const contacts: RegisteredContact[] = userList
        .filter((u) => u && (u.email || u.userId || u.id))
        .map((u) => {
          const email = (u.email || "").trim().toLowerCase();
          const name =
            u.fullName ||
            u.name ||
            `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
            (email ? email.split("@")[0] : "User");
          
          let role = u.role || u.accountType || "User";
          if (role) {
            role = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
          }

          return {
            id: u.id || u.userId || u.adminId || `user-${email}`,
            name,
            email,
            phone: u.phone || "",
            role,
            avatar: u.profilePicture || u.avatar || "",
          };
        })
        .filter((c) => Boolean(c.email));

      if (contacts.length > 0) {
        writeCachedDbContacts(contacts);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("platform_contacts_updated", { detail: contacts }));
        }
        return contacts;
      }
    }
  } catch (e) {
    console.warn("fetchRegisteredContactsFromDB fallback:", e);
  }

  return readCachedDbContacts();
}

/**
 * Return all registered DB contacts without any dummy accounts
 */
export function getAllRegisteredContacts(): RegisteredContact[] {
  const contactsMap = new Map<string, RegisteredContact>();

  // 1. Add DB cached contacts
  readCachedDbContacts().forEach((c) => {
    if (c.email) contactsMap.set(c.email.toLowerCase(), c);
  });

  // 2. Add custom contacts from localStorage
  readCustomContacts().forEach((c) => {
    if (c.email && !contactsMap.has(c.email.toLowerCase())) {
      contactsMap.set(c.email.toLowerCase(), c);
    }
  });

  return Array.from(contactsMap.values());
}

/**
 * Live search through registered contacts
 */
export function searchRegisteredContacts(query: string): RegisteredContact[] {
  const q = query.trim().toLowerCase();
  const all = getAllRegisteredContacts();
  if (!q) return all.slice(0, 15);

  return all
    .filter((contact) => {
      const email = (contact.email || "").toLowerCase();
      const name = (contact.name || "").toLowerCase();
      const phone = (contact.phone || "").toLowerCase();
      const role = (contact.role || "").toLowerCase();
      return email.includes(q) || name.includes(q) || phone.includes(q) || role.includes(q);
    })
    .sort((a, b) => {
      const aEmail = (a.email || "").toLowerCase();
      const bEmail = (b.email || "").toLowerCase();
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

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
