// ============================================================
// DATA — all reads/writes to Supabase, grouped by module
// ============================================================

const Data = (() => {
  const todayStr = () => new Date().toISOString().slice(0, 10);

  // ---------- Habits ----------
  async function listHabits(userId) {
    const { data, error } = await sb
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at", { ascending: true });
    return { data: data || [], error };
  }

  async function createHabit(userId, name, color) {
    return await sb.from("habits").insert({ user_id: userId, name, color }).select().single();
  }

  async function archiveHabit(habitId) {
    return await sb.from("habits").update({ archived: true }).eq("id", habitId);
  }

  async function getHabitLogsForDate(userId, date) {
    const { data, error } = await sb
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("log_date", date);
    return { data: (data || []).map(r => r.habit_id), error };
  }

  // Returns the last `days` dates this habit was checked off (for streak)
  async function getHabitStreak(habitId, days = 60) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await sb
      .from("habit_logs")
      .select("log_date")
      .eq("habit_id", habitId)
      .gte("log_date", since.toISOString().slice(0, 10))
      .order("log_date", { ascending: true });
    return (data || []).map(r => r.log_date);
  }

  async function toggleHabitToday(habit, userId, isChecked) {
    const date = todayStr();
    if (isChecked) {
      return await sb.from("habit_logs").delete()
        .eq("habit_id", habit.id).eq("log_date", date);
    } else {
      return await sb.from("habit_logs").insert({
        habit_id: habit.id, user_id: userId, log_date: date,
      });
    }
  }

  // ---------- Workouts ----------
  async function listWorkouts(userId, limit = 30) {
    const { data, error } = await sb
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return { data: data || [], error };
  }

  async function addWorkout(userId, { title, duration_min, notes, log_date }) {
    return await sb.from("workouts").insert({
      user_id: userId, title, duration_min: duration_min || null,
      notes: notes || null, log_date: log_date || todayStr(),
    }).select().single();
  }

  async function deleteWorkout(id) {
    return await sb.from("workouts").delete().eq("id", id);
  }

  // ---------- Expenses ----------
  async function listExpenses(userId, limit = 30) {
    const { data, error } = await sb
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return { data: data || [], error };
  }

  async function addExpense(userId, { amount, category, note, log_date }) {
    return await sb.from("expenses").insert({
      user_id: userId, amount, category: category || "other",
      note: note || null, log_date: log_date || todayStr(),
    }).select().single();
  }

  async function deleteExpense(id) {
    return await sb.from("expenses").delete().eq("id", id);
  }

  async function expensesTotalThisMonth(userId) {
    const start = new Date();
    start.setDate(1);
    const startStr = start.toISOString().slice(0, 10);
    const { data } = await sb
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .gte("log_date", startStr);
    return (data || []).reduce((sum, r) => sum + Number(r.amount), 0);
  }

  // ---------- Journal ----------
  async function getJournalEntry(userId, date) {
    const { data } = await sb
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();
    return data;
  }

  async function upsertJournalEntry(userId, date, { mood, entry }) {
    return await sb.from("journal_entries").upsert({
      user_id: userId, log_date: date, mood, entry,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,log_date" }).select().single();
  }

  async function listJournalEntries(userId, limit = 60) {
    const { data, error } = await sb
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(limit);
    return { data: data || [], error };
  }

  // ---------- Combined "today" feed ----------
  async function getTodayFeed(userId) {
    const date = todayStr();
    const [habitsRes, doneIds, workoutsRes, expensesRes] = await Promise.all([
      listHabits(userId),
      getHabitLogsForDate(userId, date),
      listWorkouts(userId, 5),
      listExpenses(userId, 5),
    ]);
    return {
      habits: habitsRes.data,
      doneHabitIds: doneIds.data,
      recentWorkouts: (workoutsRes.data || []).filter(w => w.log_date === date),
      recentExpenses: (expensesRes.data || []).filter(e => e.log_date === date),
    };
  }

  return {
    todayStr,
    listHabits, createHabit, archiveHabit, getHabitLogsForDate, getHabitStreak, toggleHabitToday,
    listWorkouts, addWorkout, deleteWorkout,
    listExpenses, addExpense, deleteExpense, expensesTotalThisMonth,
    getJournalEntry, upsertJournalEntry, listJournalEntries,
    getTodayFeed,
  };
})();
