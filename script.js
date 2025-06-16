let questions = [], answers = [], current = 0;
let duration = 0, timer, startTime;

window.onload = () => {
  const sets = JSON.parse(localStorage.getItem("savedTests") || "[]");
  const savedTestsDiv = document.getElementById("savedTests");
  sets.forEach((set, i) => {
    const btn = document.createElement("button");
    btn.textContent = `${set.title}`;
    btn.onclick = () => loadSavedTest(i);
    savedTestsDiv.appendChild(btn);
  });
};

function saveTest(title, duration, text) {
  const sets = JSON.parse(localStorage.getItem("savedTests") || "[]");
  sets.push({ title, duration, text });
  localStorage.setItem("savedTests", JSON.stringify(sets));
}

function loadSavedTest(index) {
  const sets = JSON.parse(localStorage.getItem("savedTests") || "[]");
  const { title, duration: dur, text } = sets[index];
  document.getElementById("setTitle").value = title;
  document.getElementById("duration").value = dur;
  document.getElementById("mcqInput").value = text;
  generateExam(true);
}

function generateExam(fromMemory = false) {
  const text = document.getElementById("mcqInput").value.trim();
  const title = document.getElementById("setTitle").value.trim();
  duration = parseInt(document.getElementById("duration").value);
  if (!fromMemory) saveTest(title, duration, text);

  const blocks = text.split(/(?=Q\d+\.\s)/).filter(b => b.trim());
  questions = [];

  for (let block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length !== 6) continue;
    const q = lines[0].replace(/^Q\d+\.\s*/, '');
    const opts = lines.slice(1, 5).map(line => line.replace(/^[A-D]\.\s*/, ''));
    const answerLine = lines[5];
    const answer = answerLine.split(':')[1].trim().toUpperCase();
    if (opts.length === 4 && answer) {
      questions.push({ q, opts, answer });
    }
  }

  if (questions.length === 0) {
    alert("Please follow the 6-line format: Question, 4 Options, Answer line. One blank line between each block.");
    return;
  }

  questions = questions.sort(() => Math.random() - 0.5);
  answers = Array(questions.length).fill(null);
  document.getElementById("adminPanel").classList.add("hidden");
  document.getElementById("examPanel").classList.remove("hidden");
  document.getElementById("examTitle").textContent = title;
  current = 0;
  startTime = Date.now();
  startTimer();
  renderQuestion();
  buildTracker();
  document.documentElement.requestFullscreen();
}

function startTimer() {
  let total = duration * 60;
  timer = setInterval(() => {
    const min = Math.floor(total / 60);
    const sec = total % 60;
    document.getElementById("time").textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    if (--total < 0) {
      clearInterval(timer);
      submitExam();
    }
  }, 1000);
}

function renderQuestion() {
  const q = questions[current];
  const box = document.getElementById("questionBox");
  box.innerHTML = `<strong>Q${current + 1}. ${q.q}</strong><br>`;
  q.opts.forEach((opt, i) => {
    const ch = 'ABCD'[i];
    const checked = answers[current] === ch ? 'checked' : '';
    box.innerHTML += `<label><input type="radio" name="opt" value="${ch}" ${checked} onclick="selectAnswer('${ch}')"> ${ch}. ${opt}</label><br>`;
  });
  updateTracker();
}

function selectAnswer(val) {
  answers[current] = val;
  updateTracker();
}

function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  }
}
function prevQuestion() {
  if (current > 0) {
    current--;
    renderQuestion();
  }
}

function buildTracker() {
  const tr = document.getElementById("tracker");
  tr.innerHTML = '';
  questions.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.className = "tracker-btn unanswered";
    btn.title = `Question ${i + 1}`;
    btn.onclick = () => { current = i; renderQuestion(); };
    tr.appendChild(btn);
  });
}

function updateTracker() {
  document.querySelectorAll(".tracker-btn").forEach((btn, i) => {
    btn.className = `tracker-btn ${answers[i] ? 'answered' : 'unanswered'}${i === current ? ' current' : ''}`;
  });
}

function submitExam() {
  clearInterval(timer);
  document.exitFullscreen();

  let correct = 0, wrong = 0, unanswered = 0;
  const summary = document.getElementById("summary");
  const review = document.getElementById("wrongAnswers");
  review.innerHTML = '<h4>Wrong Answers</h4>';
  questions.forEach((q, i) => {
    const user = answers[i];
    if (!user) unanswered++;
    else if (user === q.answer) correct++;
    else {
      wrong++;
      review.innerHTML += `<p><strong>Q${i + 1}:</strong> ${q.q}<br>Your Answer: ${user} | Correct: ${q.answer}</p>`;
    }
  });
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;
  summary.innerHTML = `✅ Correct: ${correct} ❌ Wrong: ${wrong} ⏳ Unanswered: ${unanswered} <br> ⏱️ Time Taken: ${mins} minutes ${secs} seconds`;

  if (typeof Chart !== 'undefined') {
    new Chart(document.getElementById("performanceChart").getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Correct', 'Wrong', 'Unanswered'],
        datasets: [{
          label: 'Performance',
          data: [correct, wrong, unanswered],
          backgroundColor: ['#2ecc71', '#e74c3c', '#f1c40f']
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }

  document.getElementById("examPanel").classList.add("hidden");
  document.getElementById("resultPanel").classList.remove("hidden");
}
