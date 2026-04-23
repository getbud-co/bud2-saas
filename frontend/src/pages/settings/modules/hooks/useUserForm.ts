import { useEffect, useRef, useState, type RefObject } from "react";
import type { CalendarDate } from "@getbud-co/buds";

export interface UserFormState {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  jobTitle: string;
  teams: string[];
  role: string;
  roleOpen: boolean;
  roleBtnRef: RefObject<HTMLButtonElement | null>;
  birthDate: CalendarDate | null;
  language: string;
  gender: string;
}

export function useUserForm(defaultRole: string, defaultLanguage = "pt-br") {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [role, setRole] = useState(defaultRole);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleBtnRef = useRef<HTMLButtonElement>(null);
  const [birthDate, setBirthDate] = useState<CalendarDate | null>(null);
  const [language, setLanguage] = useState(defaultLanguage);
  const [gender, setGender] = useState("");

  useEffect(() => {
    if (!role && defaultRole) {
      setRole(defaultRole);
    }
  }, [role, defaultRole]);

  function reset() {
    setFirstName("");
    setLastName("");
    setNickname("");
    setEmail("");
    setJobTitle("");
    setTeams([]);
    setRole(defaultRole);
    setRoleOpen(false);
    setBirthDate(null);
    setLanguage(defaultLanguage);
    setGender("");
  }

  function populateFromValues(values: {
    firstName: string;
    lastName: string;
    nickname?: string | null;
    email: string;
    jobTitle?: string | null;
    teams?: string[];
    role: string;
    birthDate?: string | null;
    language?: string;
    gender?: string | null;
  }) {
    setFirstName(values.firstName);
    setLastName(values.lastName);
    setNickname(values.nickname ?? "");
    setEmail(values.email);
    setJobTitle(values.jobTitle ?? "");
    setTeams(values.teams ?? []);
    setRole(values.role);
    setRoleOpen(false);
    setLanguage(values.language ?? defaultLanguage);
    setGender(values.gender ?? "");

    if (values.birthDate) {
      const parts = values.birthDate.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if ([year, month, day].every((p) => !Number.isNaN(p))) {
          setBirthDate({ year, month, day });
          return;
        }
      }
    }
    setBirthDate(null);
  }

  function getBirthDateString(): string | undefined {
    if (!birthDate) return undefined;
    return `${birthDate.year}-${String(birthDate.month).padStart(2, "0")}-${String(birthDate.day).padStart(2, "0")}`;
  }

  return {
    firstName, setFirstName,
    lastName, setLastName,
    nickname, setNickname,
    email, setEmail,
    jobTitle, setJobTitle,
    teams, setTeams,
    role, setRole,
    roleOpen, setRoleOpen,
    roleBtnRef,
    birthDate, setBirthDate,
    language, setLanguage,
    gender, setGender,
    reset,
    populateFromValues,
    getBirthDateString,
  };
}
