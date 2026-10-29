// Reparte trabajos entre varios Web Workers y devuelve promesas.

export class WorkerPool {
  constructor(count, createWorker) {
    this.idle = [];
    this.queue = [];
    this.pending = new Map(); // id → trabajo en curso
    this.nextId = 1;
    for (let i = 0; i < count; i++) {
      const worker = createWorker();
      worker.onmessage = ({ data }) => this.#finish(worker, data);
      worker.onerror = (e) => console.error('Error en el worker:', e.message);
      this.idle.push(worker);
    }
  }

  // Envía un mensaje; `transfer` son los buffers que se ceden al worker.
  run(message, transfer = []) {
    return new Promise((resolve) => {
      this.queue.push({ message: { ...message, id: this.nextId++ }, transfer, resolve });
      this.#dispatch();
    });
  }

  #dispatch() {
    while (this.idle.length && this.queue.length) {
      const worker = this.idle.pop();
      const job = this.queue.shift();
      this.pending.set(job.message.id, job);
      worker.postMessage(job.message, job.transfer);
    }
  }

  #finish(worker, data) {
    const job = this.pending.get(data.id);
    this.pending.delete(data.id);
    this.idle.push(worker);
    job?.resolve(data);
    this.#dispatch();
  }
}
