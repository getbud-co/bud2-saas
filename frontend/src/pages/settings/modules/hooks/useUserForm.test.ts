import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserForm } from "./useUserForm";

describe("useUserForm", () => {
  it("initializes with empty/default values", () => {
    const { result } = renderHook(() => useUserForm("admin"));

    expect(result.current.firstName).toBe("");
    expect(result.current.lastName).toBe("");
    expect(result.current.nickname).toBe("");
    expect(result.current.email).toBe("");
    expect(result.current.jobTitle).toBe("");
    expect(result.current.teams).toEqual([]);
    expect(result.current.role).toBe("admin");
    expect(result.current.roleOpen).toBe(false);
    expect(result.current.birthDate).toBeNull();
    expect(result.current.language).toBe("pt-br");
    expect(result.current.gender).toBe("");
  });

  it("uses defaultLanguage parameter", () => {
    const { result } = renderHook(() => useUserForm("admin", "en"));
    expect(result.current.language).toBe("en");
  });

  it("updates fields via setters", () => {
    const { result } = renderHook(() => useUserForm("admin"));

    act(() => {
      result.current.setFirstName("Maria");
      result.current.setLastName("Silva");
      result.current.setEmail("maria@example.com");
      result.current.setRole("gestor");
    });

    expect(result.current.firstName).toBe("Maria");
    expect(result.current.lastName).toBe("Silva");
    expect(result.current.email).toBe("maria@example.com");
    expect(result.current.role).toBe("gestor");
  });

  it("reset restores all fields to defaults", () => {
    const { result } = renderHook(() => useUserForm("admin", "en"));

    act(() => {
      result.current.setFirstName("Maria");
      result.current.setRole("gestor");
      result.current.setLanguage("es");
      result.current.setBirthDate({ year: 1990, month: 5, day: 15 });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.firstName).toBe("");
    expect(result.current.role).toBe("admin");
    expect(result.current.language).toBe("en");
    expect(result.current.birthDate).toBeNull();
    expect(result.current.roleOpen).toBe(false);
  });

  describe("populateFromValues", () => {
    it("populates all fields from values object", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.populateFromValues({
          firstName: "João",
          lastName: "Souza",
          nickname: "Jota",
          email: "joao@example.com",
          jobTitle: "Developer",
          teams: ["Engineering"],
          role: "colaborador",
          birthDate: "1995-08-20",
          language: "en",
          gender: "masculino",
        });
      });

      expect(result.current.firstName).toBe("João");
      expect(result.current.lastName).toBe("Souza");
      expect(result.current.nickname).toBe("Jota");
      expect(result.current.email).toBe("joao@example.com");
      expect(result.current.jobTitle).toBe("Developer");
      expect(result.current.teams).toEqual(["Engineering"]);
      expect(result.current.role).toBe("colaborador");
      expect(result.current.birthDate).toEqual({ year: 1995, month: 8, day: 20 });
      expect(result.current.language).toBe("en");
      expect(result.current.gender).toBe("masculino");
    });

    it("handles null/undefined optional fields gracefully", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.populateFromValues({
          firstName: "Ana",
          lastName: "Costa",
          email: "ana@example.com",
          role: "admin",
        });
      });

      expect(result.current.nickname).toBe("");
      expect(result.current.jobTitle).toBe("");
      expect(result.current.teams).toEqual([]);
      expect(result.current.birthDate).toBeNull();
      expect(result.current.language).toBe("pt-br");
      expect(result.current.gender).toBe("");
    });

    it("parses birthDate from ISO string", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.populateFromValues({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
          birthDate: "2000-01-31",
        });
      });

      expect(result.current.birthDate).toEqual({ year: 2000, month: 1, day: 31 });
    });

    it("sets birthDate to null for invalid date strings", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.populateFromValues({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
          birthDate: "not-a-date",
        });
      });

      expect(result.current.birthDate).toBeNull();
    });

    it("sets birthDate to null when birthDate is null", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.setBirthDate({ year: 1990, month: 1, day: 1 });
      });

      act(() => {
        result.current.populateFromValues({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
          birthDate: null,
        });
      });

      expect(result.current.birthDate).toBeNull();
    });
  });

  describe("getBirthDateString", () => {
    it("returns ISO string when birthDate is set", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.setBirthDate({ year: 2023, month: 7, day: 4 });
      });

      expect(result.current.getBirthDateString()).toBe("2023-07-04");
    });

    it("returns undefined when birthDate is null", () => {
      const { result } = renderHook(() => useUserForm("admin"));
      expect(result.current.getBirthDateString()).toBeUndefined();
    });

    it("zero-pads month and day", () => {
      const { result } = renderHook(() => useUserForm("admin"));

      act(() => {
        result.current.setBirthDate({ year: 1999, month: 1, day: 9 });
      });

      expect(result.current.getBirthDateString()).toBe("1999-01-09");
    });
  });

  it("sets default role via useEffect when role is empty", () => {
    const { result } = renderHook(() => useUserForm("gestor"));

    expect(result.current.role).toBe("gestor");
  });
});
