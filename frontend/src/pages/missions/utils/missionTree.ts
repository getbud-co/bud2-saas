import type { ExternalContribution, KeyResult, Mission, MissionTask } from "@/types";

export function findParentMission(krId: string, missionList: Mission[]): string {
  for (const mission of missionList) {
    for (const kr of mission.keyResults ?? []) {
      if (kr.id === krId) return mission.title;
    }

    if (mission.children) {
      const found = findParentMission(krId, mission.children);
      if (found) return found;
    }
  }

  return "";
}

export function findIndicatorById(id: string, missionList: Mission[]): KeyResult | null {
  function searchInKeyResults(keyResults: KeyResult[]): KeyResult | null {
    for (const kr of keyResults) {
      if (kr.id === id) return kr;
    }
    return null;
  }

  for (const mission of missionList) {
    const foundInMission = searchInKeyResults(mission.keyResults ?? []);
    if (foundInMission) return foundInMission;

    if (mission.children) {
      const foundInChildren = findIndicatorById(id, mission.children);
      if (foundInChildren) return foundInChildren;
    }
  }

  return null;
}

export function findTaskById(taskId: string, missionList: Mission[]): { task: MissionTask; parentLabel: string } | null {
  for (const mission of missionList) {
    const missionTask = mission.tasks?.find((task) => task.id === taskId);
    if (missionTask) return { task: missionTask, parentLabel: mission.title };

    for (const kr of mission.keyResults ?? []) {
      const keyResultTask = kr.tasks?.find((task) => task.id === taskId);
      if (keyResultTask) return { task: keyResultTask, parentLabel: `${mission.title} › ${kr.title}` };
    }

    if (mission.children) {
      const found = findTaskById(taskId, mission.children);
      if (found) return found;
    }
  }

  return null;
}

export function findTaskInMissions(taskId: string, missionList: Mission[]): MissionTask | undefined {
  for (const mission of missionList) {
    const missionTask = mission.tasks?.find((task) => task.id === taskId);
    if (missionTask) return missionTask;

    for (const kr of mission.keyResults ?? []) {
      const keyResultTask = kr.tasks?.find((task) => task.id === taskId);
      if (keyResultTask) return keyResultTask;
    }

    if (mission.children) {
      const childTask = findTaskInMissions(taskId, mission.children);
      if (childTask) return childTask;
    }
  }

  return undefined;
}

export function flattenMissions(missions: Mission[]): { id: string; title: string }[] {
  const list: { id: string; title: string }[] = [];
  for (const mission of missions) {
    list.push({ id: mission.id, title: mission.title });
    if (mission.children) list.push(...flattenMissions(mission.children));
  }
  return list;
}

export function addKRContribution(missions: Mission[], krId: string, target: { id: string; title: string }): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    keyResults: mission.keyResults?.map((kr) =>
      kr.id === krId
        ? {
            ...kr,
            contributesTo: kr.contributesTo?.some((c) => c.missionId === target.id)
              ? kr.contributesTo
              : [...(kr.contributesTo ?? []), { missionId: target.id, missionTitle: target.title }],
          }
        : kr
    ),
    children: mission.children ? addKRContribution(mission.children, krId, target) : undefined,
  }));
}

export function addTaskContribution(missions: Mission[], taskId: string, target: { id: string; title: string }): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    tasks: mission.tasks?.map((task) =>
      task.id === taskId
        ? {
            ...task,
            contributesTo: task.contributesTo?.some((c) => c.missionId === target.id)
              ? task.contributesTo
              : [...(task.contributesTo ?? []), { missionId: target.id, missionTitle: target.title }],
          }
        : task
    ),
    children: mission.children ? addTaskContribution(mission.children, taskId, target) : undefined,
  }));
}

export function addExternalContrib(missions: Mission[], targetId: string, contrib: ExternalContribution): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    externalContributions:
      mission.id === targetId && !mission.externalContributions?.some((ec) => ec.id === contrib.id)
        ? [...(mission.externalContributions ?? []), contrib]
        : mission.externalContributions,
    children: mission.children ? addExternalContrib(mission.children, targetId, contrib) : undefined,
  }));
}

export function removeKRContribution(missions: Mission[], krId: string, targetMissionId: string): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    keyResults: mission.keyResults?.map((kr) =>
      kr.id === krId
        ? { ...kr, contributesTo: kr.contributesTo?.filter((c) => c.missionId !== targetMissionId) }
        : kr
    ),
    children: mission.children ? removeKRContribution(mission.children, krId, targetMissionId) : undefined,
  }));
}

export function removeTaskContribution(missions: Mission[], taskId: string, targetMissionId: string): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    tasks: mission.tasks?.map((task) =>
      task.id === taskId
        ? { ...task, contributesTo: task.contributesTo?.filter((c) => c.missionId !== targetMissionId) }
        : task
    ),
    children: mission.children ? removeTaskContribution(mission.children, taskId, targetMissionId) : undefined,
  }));
}

export function removeExternalContrib(missions: Mission[], targetMissionId: string, itemId: string): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    externalContributions:
      mission.id === targetMissionId
        ? mission.externalContributions?.filter((external) => external.id !== itemId)
        : mission.externalContributions,
    children: mission.children ? removeExternalContrib(mission.children, targetMissionId, itemId) : undefined,
  }));
}
