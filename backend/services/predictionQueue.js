// services/predictionQueue.js
class PredictionQueue {
    constructor() {
      this.q = [];
      this.active = false;
    }
  
    enqueue(taskFn, meta = {}) {
      return new Promise((resolve, reject) => {
        this.q.push({ taskFn, resolve, reject, meta, enqueuedAt: Date.now() });
        this.#drain();
      });
    }
  
    size() {
      return this.q.length + (this.active ? 1 : 0);
    }
  
    async #drain() {
      if (this.active) return;
      this.active = true;
      while (this.q.length) {
        const item = this.q.shift();
        try {
          await item.taskFn();
          item.resolve();
        } catch (err) {
          item.reject(err);
        }
      }
      this.active = false;
    }
  }
  
  module.exports = new PredictionQueue();
  