import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

// Configuración de carga (podés ajustar estos valores o pasarlos por env)
const MORE_LOAD_CONFIG = {
  iterations: Number(import.meta.env.VITE_LOAD_MORE_ITERATIONS ?? 200),
  sizeMb: Number(import.meta.env.VITE_LOAD_MORE_SIZE_MB ?? 10),
};

const LESS_LOAD_CONFIG = {
  iterations: Number(import.meta.env.VITE_LOAD_LESS_ITERATIONS ?? 20),
  sizeMb: Number(import.meta.env.VITE_LOAD_LESS_SIZE_MB ?? 5),
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingLoad, setIsGeneratingLoad] = useState(false);
  // "more" = próxima acción mete más carga, "less" = próxima acción mete menos carga
  const [loadMode, setLoadMode] = useState("more");

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const result = await axios.get(`${API_URL}/tasks`);
        setTasks(result.data.tasks ?? []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/tasks`, { title: newTask });
      if (res.data?.task) {
        setTasks((prev) => [...prev, res.data.task]);
      }
      setNewTask("");
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await axios.put(`${API_URL}/tasks/${id}`, { status });
      if (res.data?.task) {
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? res.data.task : task))
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Botón sutil: genera carga controlada en el backend
  const handleGenerateControlledLoad = async () => {
    const actionMode = loadMode; // modo de esta ejecución

    try {
      setIsGeneratingLoad(true);

      const config =
        actionMode === "more" ? MORE_LOAD_CONFIG : LESS_LOAD_CONFIG;

      await axios.post(`${API_URL}/test`, {
        iterations: config.iterations,
        sizeMb: config.sizeMb,
        action: "allocate",
      });

      // Alternamos el modo para el próximo click
      setLoadMode((prev) => (prev === "more" ? "less" : "more"));
    } catch (error) {
      console.error("Error generating controlled load:", error);
    } finally {
      setIsGeneratingLoad(false);
    }
  };

  const buttonLabel = isGeneratingLoad
    ? loadMode === "more"
      ? "Metiendo más carga..."
      : "Metiendo menos carga..."
    : loadMode === "more"
    ? "Meter más carga"
    : "Meter menos carga";

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
              className={`task-card ${
                task.status === "completada" ? "completed" : ""
              }`}
            >
              <div className="task-content">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={task.status === "completada"}
                    onChange={(e) =>
                      handleStatusChange(
                        task.id,
                        e.target.checked ? "completada" : "pendiente"
                      )
                    }
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                </label>

                <div className="task-info">
                  <div className="task-title-row">
                    <h3
                      className={`task-title ${
                        task.status === "completada" ? "completed" : ""
                      }`}
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

      {/* Botón flotante de carga controlada en una esquina de la página */}
      <div className="corner-load-button">
        <button
          type="button"
          className="btn btn-ghost subtle-btn"
          onClick={handleGenerateControlledLoad}
          disabled={isGeneratingLoad || isLoading}
          title="Ejecuta una carga controlada sobre el servidor (más o menos carga según el modo actual)"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

export default App;
