import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  Home,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2
} from "lucide-react";

const STORAGE_KEY = "student-life-manager.tasks";

const categories = ["Assignment", "Exam", "Daily Life", "Gym", "Other"];
const priorities = ["High", "Medium", "Low"];

const categoryMeta = {
  Assignment: { ko: "Assignment", icon: ClipboardList, color: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  Exam: { ko: "Exam", icon: GraduationCap, color: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  "Daily Life": { ko: "Daily Life", icon: Home, color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Gym: { ko: "Gym", icon: Dumbbell, color: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  Other: { ko: "Other", icon: Sparkles, color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" }
};

const priorityMeta = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-orange-50 text-orange-700 border-orange-200",
  Low: "bg-green-50 text-green-700 border-green-200"
};

const navItems = [
  { id: "dashboard", label: "Dashboard", ko: "Dashboard", icon: Home },
  { id: "tasks", label: "Tasks", ko: "Tasks", icon: ClipboardList },
  { id: "calendar", label: "Calendar", ko: "Calendar", icon: CalendarDays },
  { id: "planner", label: "Study Planner", ko: "Study Planner", icon: Target },
  { id: "settings", label: "Settings", ko: "Settings", icon: Settings }
];

const seedTasks = [
  {
    id: "seed-1",
    title: "Submit economics report",
    subject: "Economics",
    category: "Assignment",
    deadline: todayOffset(2),
    priority: "High",
    memo: "Check the bibliography format",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "seed-2",
    title: "Review for data structures midterm",
    subject: "Computer Science",
    category: "Exam",
    deadline: todayOffset(5),
    priority: "High",
    memo: "Trees, graphs, and sorting algorithms",
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "seed-3",
    title: "Do dorm laundry",
    subject: "Life",
    category: "Daily Life",
    deadline: todayOffset(0),
    priority: "Low",
    memo: "Wash gym clothes too",
    completed: true,
    createdAt: new Date().toISOString()
  }
];

const emptyForm = {
  title: "",
  subject: "",
  category: "Assignment",
  deadline: "",
  priority: "Medium",
  memo: ""
};

function todayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(dateFromInput(value));
}

function isOverdue(task) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.deadline && !task.completed && dateFromInput(task.deadline) < today;
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      value: toDateInputValue(date),
      inMonth: date.getMonth() === month
    };
  });
}

function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : seedTasks;
    } catch {
      return seedTasks;
    }
  });
  const [activeView, setActiveView] = useState("dashboard");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    category: "All",
    subject: "All",
    search: ""
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const overdue = tasks.filter(isOverdue).length;
    const upcoming = tasks.filter((task) => {
      if (!task.deadline || task.completed || isOverdue(task)) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = (dateFromInput(task.deadline) - today) / 86400000;
      return diff <= 7;
    }).length;
    const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    return { total: tasks.length, completed, overdue, upcoming, progress };
  }, [tasks]);

  const subjects = useMemo(() => {
    const unique = [...new Set(tasks.map((task) => task.subject).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => filters.category === "All" || task.category === filters.category)
      .filter((task) => filters.subject === "All" || task.subject === filters.subject)
      .filter((task) => task.title.toLowerCase().includes(filters.search.trim().toLowerCase()))
      .sort(sortTasks);
  }, [tasks, filters]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((grouped, task) => {
      if (!task.deadline) return grouped;
      return { ...grouped, [task.deadline]: [...(grouped[task.deadline] || []), task] };
    }, {});
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    return [...(tasksByDate[selectedDate] || [])].sort(sortTasks);
  }, [tasksByDate, selectedDate]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((task) => !task.completed && task.deadline).sort(sortTasks).slice(0, 6);
  }, [tasks]);

  function sortTasks(a, b) {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (isOverdue(a) !== isOverdue(b)) return Number(isOverdue(b)) - Number(isOverdue(a));
    return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;

    if (editingId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingId
            ? {
                ...task,
                ...form,
                title: form.title.trim(),
                subject: form.subject.trim() || "General"
              }
            : task
        )
      );
      setEditingId(null);
    } else {
      setTasks((current) => [
        {
          ...form,
          id: crypto.randomUUID(),
          title: form.title.trim(),
          subject: form.subject.trim() || "General",
          completed: false,
          createdAt: new Date().toISOString()
        },
        ...current
      ]);
    }

    setForm(emptyForm);
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      subject: task.subject,
      category: task.category,
      deadline: task.deadline,
      priority: task.priority,
      memo: task.memo
    });
    setActiveView("tasks");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addTaskForDate(dateValue) {
    setEditingId(null);
    setForm({ ...emptyForm, deadline: dateValue });
    setActiveView("tasks");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleComplete(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (editingId === id) cancelEdit();
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.completed));
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeView={activeView} setActiveView={setActiveView} stats={stats} />

        <main className="w-full flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-7xl">
            <Header activeView={activeView} />

            {activeView === "dashboard" && (
              <Dashboard
                stats={stats}
                upcomingTasks={upcomingTasks}
                onEdit={startEdit}
                onDelete={deleteTask}
                onToggle={toggleComplete}
                setActiveView={setActiveView}
              />
            )}

            {activeView === "tasks" && (
              <TasksPage
                editingId={editingId}
                form={form}
                setForm={setForm}
                handleSubmit={handleSubmit}
                cancelEdit={cancelEdit}
                filters={filters}
                setFilters={setFilters}
                subjects={subjects}
                filteredTasks={filteredTasks}
                onEdit={startEdit}
                onDelete={deleteTask}
                onToggle={toggleComplete}
              />
            )}

            {activeView === "calendar" && (
              <CalendarPage
                tasksByDate={tasksByDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                calendarMonth={calendarMonth}
                setCalendarMonth={setCalendarMonth}
                selectedDateTasks={selectedDateTasks}
                onAddForDate={addTaskForDate}
                onEdit={startEdit}
                onDelete={deleteTask}
                onToggle={toggleComplete}
              />
            )}

            {activeView === "planner" && <PlannerPage tasks={tasks} stats={stats} />}

            {activeView === "settings" && (
              <SettingsPage tasks={tasks} clearCompleted={clearCompleted} setTasks={setTasks} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, stats }) {
  return (
    <aside className="bg-[#172033] px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:px-6 lg:py-7">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#f6c85f] text-[#172033]">
          <BookOpen size={24} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Student Life</p>
          <h1 className="text-xl font-bold">Manager</h1>
        </div>
      </div>

      <nav className="mt-7 grid gap-2 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold transition ${
                active ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              <span>{item.ko}</span>
              <span className="ml-auto text-xs text-slate-400">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-8 rounded-lg bg-white/10 p-4">
        <p className="text-sm font-semibold text-slate-100">Weekly Focus</p>
        <div className="mt-4 h-2 rounded-full bg-white/15">
          <div className="h-2 rounded-full bg-[#f6c85f] transition-all" style={{ width: `${stats.progress}%` }} />
        </div>
        <p className="mt-3 text-2xl font-bold">{stats.progress}%</p>
        <p className="text-sm text-slate-300">Progress based on completed tasks</p>
      </div>
    </aside>
  );
}

function Header({ activeView }) {
  const current = navItems.find((item) => item.id === activeView);

  return (
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-semibold text-[#2775ff]">{current.ko}</p>
        <h2 className="mt-1 text-3xl font-bold text-[#172033] sm:text-4xl">{current.label}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Keep assignments, exams, routines, and deadlines organized in one place.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft">
        <CalendarDays size={18} className="text-[#2775ff]" />
        {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date())}
      </div>
    </header>
  );
}

function Dashboard({ stats, upcomingTasks, onEdit, onDelete, onToggle, setActiveView }) {
  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Tasks" value={stats.total} tone="bg-white" />
        <StatCard label="Completed" value={stats.completed} tone="bg-white" />
        <StatCard label="Overdue" value={stats.overdue} tone="bg-red-50" />
        <StatCard label="Due in 7 Days" value={stats.upcoming} tone="bg-sky-50" />
        <StatCard label="Progress" value={`${stats.progress}%`} tone="bg-emerald-50" />
      </div>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold text-[#172033]">Upcoming Deadlines</h3>
            <p className="mt-1 text-sm text-slate-500">The tasks that need your attention first.</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView("calendar")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2775ff] px-4 py-3 text-sm font-bold text-white"
          >
            <CalendarDays size={18} />
            View Calendar
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {upcomingTasks.length ? (
            upcomingTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
            ))
          ) : (
            <EmptyState title="No upcoming deadlines." body="Add a new task and it will appear on your dashboard." />
          )}
        </div>
      </section>
    </>
  );
}

function TasksPage({
  editingId,
  form,
  setForm,
  handleSubmit,
  cancelEdit,
  filters,
  setFilters,
  subjects,
  filteredTasks,
  onEdit,
  onDelete,
  onToggle
}) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[430px_1fr]">
      <TaskForm editingId={editingId} form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancelEdit} />
      <TaskBoard
        filters={filters}
        setFilters={setFilters}
        subjects={subjects}
        filteredTasks={filteredTasks}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    </div>
  );
}

function TaskForm({ editingId, form, setForm, onSubmit, onCancel }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#172033]">{editingId ? "Edit Task" : "Add New Task"}</h3>
          <p className="mt-1 text-sm text-slate-500">Save the deadline, priority, and notes together.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e8f1ff] text-[#2775ff]">
          <Plus size={21} />
        </div>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <Field label="Title">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Example: Prepare psychology presentation"
            required
          />
        </Field>

        <Field label="Subject">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            placeholder="Example: Psychology"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryMeta[category].ko} · {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Deadline">
          <input
            type="date"
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
            value={form.deadline}
            onChange={(event) => setForm({ ...form, deadline: event.target.value })}
          />
        </Field>

        <Field label="Memo">
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-sm"
            value={form.memo}
            onChange={(event) => setForm({ ...form, memo: event.target.value })}
            placeholder="Add supplies, scope, links, or anything you need to remember."
          />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2775ff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#175fd8]"
          >
            <Check size={18} />
            {editingId ? "Save Changes" : "Save Task"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function TaskBoard({ filters, setFilters, subjects, filteredTasks, onEdit, onDelete, onToggle }) {
  return (
    <section className="min-w-0 rounded-lg bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h3 className="text-xl font-bold text-[#172033]">Task Board</h3>
          <p className="mt-1 text-sm text-slate-500">Use search and filters to quickly find what matters today.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[620px]">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Search by title"
            />
          </label>
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.category}
            onChange={(event) => setFilters({ ...filters, category: event.target.value })}
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryMeta[category].ko} · {category}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.subject}
            onChange={(event) => setFilters({ ...filters, subject: event.target.value })}
          >
            <option value="All">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {filteredTasks.length === 0 ? (
          <EmptyState title="No tasks match your filters." body="Adjust the filters or add a new task." />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
          ))
        )}
      </div>
    </section>
  );
}

function CalendarPage({
  tasksByDate,
  selectedDate,
  setSelectedDate,
  calendarMonth,
  setCalendarMonth,
  selectedDateTasks,
  onAddForDate,
  onEdit,
  onDelete,
  onToggle
}) {
  const days = getCalendarDays(calendarMonth);
  const today = toDateInputValue(new Date());
  const monthLabel = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(calendarMonth);

  function moveMonth(amount) {
    const next = new Date(calendarMonth);
    next.setMonth(calendarMonth.getMonth() + amount);
    setCalendarMonth(next);
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="rounded-lg bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold text-[#172033]">Monthly Calendar</h3>
            <p className="mt-1 text-sm text-slate-500">All tasks are shown on their deadline dates.</p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Previous month" onClick={() => moveMonth(-1)} className="bg-slate-100 text-slate-700">
              <ChevronLeft size={18} />
            </IconButton>
            <div className="min-w-36 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-bold text-slate-700">
              {monthLabel}
            </div>
            <IconButton label="Next month" onClick={() => moveMonth(1)} className="bg-slate-100 text-slate-700">
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayTasks = tasksByDate[day.value] || [];
            const selected = selectedDate === day.value;
            const isToday = today === day.value;
            const hasOverdue = dayTasks.some(isOverdue);

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setSelectedDate(day.value)}
                className={`min-h-24 rounded-lg border p-2 text-left transition sm:min-h-32 ${
                  selected
                    ? "border-[#2775ff] bg-[#e8f1ff]"
                    : hasOverdue
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                } ${day.inMonth ? "text-slate-800" : "text-slate-300"}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${
                    isToday ? "bg-[#2775ff] text-white" : ""
                  }`}
                >
                  {day.date.getDate()}
                </span>
                <div className="mt-2 grid gap-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-bold ${
                        isOverdue(task) ? "bg-red-600 text-white" : categoryMeta[task.category].color
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryMeta[task.category].dot}`} />
                      {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 && <span className="text-[11px] font-bold text-slate-500">+{dayTasks.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2775ff]">Selected date</p>
            <h3 className="mt-1 text-xl font-bold text-[#172033]">{formatDate(selectedDate)}</h3>
          </div>
          <button
            type="button"
            onClick={() => onAddForDate(selectedDate)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2775ff] px-4 py-3 text-sm font-bold text-white"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {selectedDateTasks.length ? (
            selectedDateTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} compact />
            ))
          ) : (
            <EmptyState title="No tasks on this date." body="Use Add to create a task with this date as its deadline." />
          )}
        </div>
      </aside>
    </div>
  );
}

function PlannerPage({ tasks, stats }) {
  const openByCategory = categories.map((category) => ({
    category,
    count: tasks.filter((task) => task.category === category && !task.completed).length
  }));
  const highPriority = tasks.filter((task) => task.priority === "High" && !task.completed).sort((a, b) => {
    return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
  });

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-xl font-bold text-[#172033]">Study Planner</h3>
        <p className="mt-1 text-sm text-slate-500">Review open tasks by category and set your priorities for today.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openByCategory.map(({ category, count }) => {
            const Icon = categoryMeta[category].icon;
            return (
              <article key={category} className="rounded-lg border border-slate-200 p-4">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${categoryMeta[category].color}`}>
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-500">{categoryMeta[category].ko}</p>
                <p className="mt-1 text-3xl font-bold text-[#172033]">{count}</p>
                <p className="mt-1 text-sm text-slate-500">Open Tasks</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-xl font-bold text-[#172033]">Today's Focus List</h3>
        <p className="mt-1 text-sm text-slate-500">Sorted by high priority and the soonest deadlines.</p>
        <div className="mt-5 grid gap-3">
          {highPriority.length ? (
            highPriority.slice(0, 5).map((task) => (
              <div key={task.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-bold text-[#172033]">{task.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {task.subject} · {formatDate(task.deadline)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No high-priority tasks." body={`Your overall progress is currently ${stats.progress}%.`} />
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsPage({ tasks, clearCompleted, setTasks }) {
  return (
    <section className="mt-6 rounded-lg bg-white p-5 shadow-soft">
      <h3 className="text-xl font-bold text-[#172033]">Settings</h3>
      <p className="mt-1 text-sm text-slate-500">Manage the data saved in localStorage.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={clearCompleted}
          className="min-h-12 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Clear Completed Tasks
        </button>
        <button
          type="button"
          onClick={() => setTasks(seedTasks)}
          className="min-h-12 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Reload Sample Data
        </button>
      </div>
      <p className="mt-5 text-sm text-slate-500">{tasks.length} tasks are currently saved in this browser.</p>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`${tone} rounded-lg p-5 shadow-soft`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[#172033]">{value}</p>
    </article>
  );
}

function TaskCard({ task, onEdit, onDelete, onToggle }) {
  const CategoryIcon = categoryMeta[task.category].icon;
  const overdue = isOverdue(task);

  return (
    <article
      className={`rounded-lg border p-4 transition ${
        task.completed ? "border-emerald-200 bg-emerald-50/60" : overdue ? "border-red-200 bg-red-50/70" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${categoryMeta[task.category].color}`}>
              <CategoryIcon size={14} />
              {categoryMeta[task.category].ko}
            </span>
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${priorityMeta[task.priority]}`}>
              {task.priority}
            </span>
            {overdue && <span className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">Overdue</span>}
          </div>
          <h4 className={`mt-3 break-words text-lg font-bold ${task.completed ? "text-slate-500 line-through" : "text-[#172033]"}`}>
            {task.title}
          </h4>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>Subject: {task.subject}</span>
            <span>Deadline: {formatDate(task.deadline)}</span>
          </div>
          {task.memo && <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{task.memo}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 md:w-36">
          <IconButton
            label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            onClick={() => onToggle(task.id)}
            className={task.completed ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}
          >
            <CheckCircle2 size={18} />
          </IconButton>
          <IconButton label="Edit" onClick={() => onEdit(task)} className="bg-sky-100 text-sky-700">
            <Pencil size={18} />
          </IconButton>
          <IconButton label="Delete" onClick={() => onDelete(task.id)} className="bg-red-100 text-red-700">
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function IconButton({ label, children, className, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-11 w-full place-items-center rounded-lg transition hover:brightness-95 ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

export default App;
