import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const result = await axios.get(`${API_URL}/tasks`);
        setTasks(result.data.tasks);
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
      setTasks([...tasks, res.data.task]);
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
      setTasks(tasks.map((task) => (task.id === id ? res.data.task : task)));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
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
