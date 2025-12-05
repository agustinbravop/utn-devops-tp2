import { useState, useEffect } from "react";
import axios from "axios";
import { trace } from "@opentelemetry/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

// Obtener el tracer para crear spans manuales.
const tracer = trace.getTracer("frontend-app");

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      // Crear un span para rastrear la carga inicial de tareas
      const span = tracer.startSpan("fetch-tasks-on-mount");

      try {
        setIsLoading(true);
        span.setAttribute("operation", "initial-load");
        span.setAttribute("component", "useEffect");

        const result = await axios.get(`${API_URL}/tasks`);

        setTasks(result.data.tasks);

        // Añadir atributos útiles para debugging
        span.setAttribute("tasks.count", result.data.tasks.length);
        span.setAttribute("success", true);
      } catch (error) {
        // Registrar el error en el span
        span.recordException(error);
        span.setAttribute("error", true);
        span.setAttribute("error.message", error.message);

        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
        // Siempre finalizar el span
        span.end();
      }
    };

    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    // Crear span para la acción de crear tarea
    const span = tracer.startSpan("create-task-action");

    try {
      setIsLoading(true);

      // Añadir atributos descriptivos
      span.setAttribute("task.title", newTask);
      span.setAttribute("task.title.length", newTask.length);
      span.setAttribute("user.action", "create_task");
      span.setAttribute("component", "handleCreateTask");

      const res = await axios.post(`${API_URL}/tasks`, { title: newTask });

      setTasks([...tasks, res.data.task]);
      setNewTask("");

      // Registrar éxito
      span.setAttribute("task.id", res.data.task.id);
      span.setAttribute("success", true);
    } catch (error) {
      // Registrar error
      span.recordException(error);
      span.setAttribute("error", true);
      span.setAttribute("error.message", error.message);

      console.error("❌ Error creating task:", error);
    } finally {
      setIsLoading(false);
      span.end();
    }
  };

  const handleStatusChange = async (id, status) => {
    // Crear span para cambio de estado
    const span = tracer.startSpan("update-task-status");

    try {
      span.setAttribute("task.id", id);
      span.setAttribute(
        "task.old_status",
        tasks.find((t) => t.id === id)?.status || "unknown",
      );
      span.setAttribute("task.new_status", status);
      span.setAttribute("user.action", "toggle_status");
      span.setAttribute("component", "handleStatusChange");

      const res = await axios.put(`${API_URL}/tasks/${id}`, { status });

      setTasks(tasks.map((task) => (task.id === id ? res.data.task : task)));

      span.setAttribute("success", true);
    } catch (error) {
      span.recordException(error);
      span.setAttribute("error", true);
      span.setAttribute("error.message", error.message);

      console.error("❌ Error updating task:", error);
    } finally {
      span.end();
    }
  };

  const handleDeleteTask = async (id) => {
    // Crear span para eliminación
    const span = tracer.startSpan("delete-task-action");

    try {
      const taskToDelete = tasks.find((t) => t.id === id);

      span.setAttribute("task.id", id);
      span.setAttribute("task.title", taskToDelete?.title || "unknown");
      span.setAttribute("user.action", "delete_task");
      span.setAttribute("component", "handleDeleteTask");

      await axios.delete(`${API_URL}/tasks/${id}`);

      setTasks(tasks.filter((task) => task.id !== id));

      span.setAttribute("success", true);
    } catch (error) {
      span.recordException(error);
      span.setAttribute("error", true);
      span.setAttribute("error.message", error.message);

      console.error("❌ Error deleting task:", error);
    } finally {
      span.end();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1 className="title">Task Manager</h1>
      </div>

      {/* Add Task Form */}
      <div className="form-container">
        <form onSubmit={handleCreateTask} className="form">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What needs to be done?"
            className="input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!newTask.trim() || isLoading}
          >
            {isLoading ? "Adding..." : "Add Task"}
          </button>
        </form>
      </div>

      {/* Tasks List */}
      <div className="task-list">
        {isLoading && tasks.length === 0 ? (
          <div className="loading">
            <div className="loading-text">Loading tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">No tasks yet</h3>
            <p className="empty-description">
              Add your first task to get started!
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${task.status === "completada" ? "completed" : ""}`}
            >
              <div className="task-content">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={task.status === "completada"}
                    onChange={(e) =>
                      handleStatusChange(
                        task.id,
                        e.target.checked ? "completada" : "pendiente",
                      )
                    }
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                </label>

                <div className="task-info">
                  <div className="task-title-row">
                    <h3
                      className={`task-title ${task.status === "completada" ? "completed" : ""}`}
                    >
                      {task.title}
                    </h3>
                  </div>
                </div>

                <div className="task-controls">
                  <button
                    className="btn btn-danger delete-btn"
                    onClick={() => handleDeleteTask(task.id)}
                    title="Delete task"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
