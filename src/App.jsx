
import React, { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "./data/exercises";
import { PROGRAMS } from "./data/programs";
import { STRENGTH_STANDARDS } from "./data/strengthStandards";
import { initialBosses } from "./data/bosses";

import ProfileCard from "./components/ProfileCard";
import ProfileView from "./components/ProfileView";
import LogModal from "./components/LogModal";
import BossArena from "./components/BossArena";
import BattlePass from "./components/BattlePass";
import ProgramRunner from "./components/ProgramRunner";
import PRList from "./components/PRList";
import MuscleMap from "./components/MuscleMap";
import MuscleComparison from "./components/MuscleComparison";
import Toast from "./components/Toast";

const TIER_XP = 200;

export default function App() {
  const [profile, setProfile] = useState({
    name: "Bebi",
    nick: "💖",
    age: 25,
    height: 165,
    weight: 65,
  });

  const [logs, setLogs] = useState([]);
  const [bosses, setBosses] = useState(initialBosses());
  const [xp, setXp] = useState(0);

  const [claimedRewards, setClaimedRewards] = useState(() => {
    const s = localStorage.getItem("bebi_claimedRewards");
    return s ? JSON.parse(s) : [];
  });

  const [toast, setToast] = useState(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    localStorage.setItem("bebi_claimedRewards", JSON.stringify(claimedRewards));
  }, [claimedRewards]);

  useEffect(() => {
    if (!localStorage.getItem("bebi_onboarded")) {
      setToast({
        title: "Välkommen till Bebi Gym 💖",
        subtitle: "Logga ditt första set och krossa en boss!",
      });
      localStorage.setItem("bebi_onboarded", "true");
    }
  }, []);

  function handleSaveLog(entry) {
    const finalEntry = { ...entry, id: crypto.randomUUID() };
    setLogs((p) => [finalEntry, ...p]);

    let baseXp = 10 + entry.reps * 2;
    if (entry.rpe >= 9) baseXp *= 1.25;
    else if (entry.rpe >= 8) baseXp *= 1.1;

    setXp((x) => x + Math.round(baseXp));
    setShowLog(false);
  }

  const recompute = useMemo(() => {
    const chronological = [...logs].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const prMap = {};
    const muscleStats = {};
    let newBosses = initialBosses();

    chronological.forEach((l) => {
      const ex = EXERCISES.find((e) => e.id === l.exerciseId);
      const std = STRENGTH_STANDARDS[l.exerciseId];
      if (!std) return;

      const est1RM = Math.round(l.weight * (1 + l.reps / 30));

      if (!prMap[l.exerciseId]) {
        prMap[l.exerciseId] = { best1RM: est1RM, history: [l] };
      } else if (est1RM > prMap[l.exerciseId].best1RM) {
        prMap[l.exerciseId].best1RM = est1RM;
        prMap[l.exerciseId].history.push(l);
      }

      std.muscles.forEach((m) => {
        muscleStats[m] = muscleStats[m] || { score: 0 };
        muscleStats[m].score += est1RM * std.coeff;
      });

      Object.values(newBosses).forEach((b) => {
        if (std.muscles.some((m) => b.muscles.includes(m))) {
          b.currentHP = Math.max(0, b.currentHP - est1RM);
        }
      });
    });

    Object.entries(muscleStats).forEach(([k, v]) => {
      v.percent = Math.min(150, Math.round(v.score / 100));
      v.levelKey =
        v.percent >= 120
          ? "Elite"
          : v.percent >= 100
          ? "Advanced"
          : v.percent >= 80
          ? "Intermediate"
          : v.percent >= 60
          ? "Novice"
          : "Beginner";
    });

    return { prMap, muscleStats, newBosses };
  }, [logs]);

  useEffect(() => {
    setBosses(recompute.newBosses);
  }, [recompute.newBosses]);

  const battleTier = Math.max(1, Math.floor(xp / TIER_XP) + 1);
  const tierBaseXp = (battleTier - 1) * TIER_XP;
  const tierProgressXp = xp - tierBaseXp;

  return (
    <div className="app-shell">
      <Toast {...toast} />
      <main className="main">
        <ProfileCard profile={profile} />
        <button className="btn-pink" onClick={() => setShowLog(true)}>
          Logga set 💪
        </button>

        <BattlePass
          tier={battleTier}
          xp={tierProgressXp}
          nextTierXp={TIER_XP}
          claimedRewards={claimedRewards}
          onClaimReward={(r) =>
            setClaimedRewards((p) => [...new Set([...p, r])])
          }
        />

        <BossArena bosses={bosses} />
        <ProgramRunner
          programs={PROGRAMS}
          activeProgramId={PROGRAMS[0].id}
          dayIndex={0}
          logs={logs}
          onNextDay={() =>
            setToast({
              title: "Programdag klar! 🎉",
              subtitle: "+50 XP",
            }) || setXp((x) => x + 50)
          }
        />

        <PRList prMap={recompute.prMap} />
        <MuscleMap muscleStats={recompute.muscleStats} />
        <MuscleComparison
          data={Object.entries(recompute.muscleStats).map(([id, s]) => ({
            id,
            name: id,
            actual: s.percent,
            levelKey: s.levelKey,
          }))}
        />

        <ProfileView
          profile={profile}
          setProfile={setProfile}
          bodyStats={{}}
          onAddMeasurement={() => {}}
          onDeleteMeasurement={() => {}}
        />

        <LogModal
          open={showLog}
          onClose={() => setShowLog(false)}
          onSave={handleSaveLog}
        />
      </main>
    </div>
  );
}
