const STORAGE_KEYS = {
  questions: "quizMaster_questions_v1",
  history: "quizMaster_history_v1",
  progress: "quizMaster_progress_v1"
};

const defaultQuestions = [
  {id:"q1",question:"Which language is used to structure a web page?",options:["CSS","HTML","JavaScript","Python"],correct:1},
  {id:"q2",question:"Which CSS property changes text color?",options:["font-style","background","color","text-size"],correct:2},
  {id:"q3",question:"Which keyword declares a block-scoped variable in JavaScript?",options:["var","let","define","dim"],correct:1},
  {id:"q4",question:"Which method converts a JavaScript object into a JSON string?",options:["JSON.parse()","JSON.stringify()","JSON.object()","toJSON.parse()"],correct:1},
  {id:"q5",question:"Which browser storage keeps data after the browser is closed?",options:["sessionStorage","localStorage","temporary variable","console"],correct:1},
  {id:"q6",question:"Which HTML tag creates a hyperlink?",options:["<link>","<a>","<href>","<url>"],correct:1},
  {id:"q7",question:"Which symbol is used for a single-line comment in JavaScript?",options:["<!-- -->","//","**","##"],correct:1},
  {id:"q8",question:"Which CSS layout system is designed for one-dimensional layouts?",options:["Flexbox","SQL","DOM","JSON"],correct:0},
  {id:"q9",question:"What does DOM stand for?",options:["Data Object Model","Document Object Model","Digital Ordinance Model","Document Order Method"],correct:1},
  {id:"q10",question:"Which event happens when a user clicks an element?",options:["onchange","onload","onclick","onsubmit"],correct:2}
];

let questions = loadJSON(STORAGE_KEYS.questions, null) || defaultQuestions;
let history = loadJSON(STORAGE_KEYS.history, []);
let currentIndex = 0;
let answers = {};
let remainingSeconds = 600;
let timerInterval = null;
let lastResult = null;
let toastTimeout = null;

const $ = id => document.getElementById(id);

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error("Could not read Local Storage:", error);
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2400);
}
function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.add("hidden"));
  $(name + "View").classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
  if (name === "home") renderDashboard();
  if (name === "history") renderHistory();
  if (name === "admin") renderAdminQuestions();
  window.scrollTo({top:0,behavior:"smooth"});
}
function persistProgress() {
  saveJSON(STORAGE_KEYS.progress, {
    currentIndex, answers, remainingSeconds, updatedAt: Date.now()
  });
}
function clearProgress() {
  localStorage.removeItem(STORAGE_KEYS.progress);
}
function renderDashboard() {
  const attempts = history.length;
  const scores = history.map(item => item.percentage);
  $("totalAttempts").textContent = attempts;
  $("bestScore").textContent = (scores.length ? Math.max(...scores) : 0) + "%";
  $("averageScore").textContent = (scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0) + "%";
  $("questionCount").textContent = `${questions.length} Questions`;
  const saved = loadJSON(STORAGE_KEYS.progress, null);
  $("resumeNote").textContent = saved ? "You have an unfinished quiz. Start Quiz will resume it." : "Your quiz progress and results are saved on this device.";
}
function startQuiz() {
  if (questions.length === 0) {
    showToast("Please add questions from the Admin panel first.");
    return;
  }
  const saved = loadJSON(STORAGE_KEYS.progress, null);
  if (saved && confirm("An unfinished quiz was found. Resume it? Click Cancel to start a new quiz.")) {
    currentIndex = Math.min(saved.currentIndex || 0, questions.length - 1);
    answers = saved.answers || {};
    remainingSeconds = Number.isFinite(saved.remainingSeconds) ? saved.remainingSeconds : 600;
  } else {
    currentIndex = 0;
    answers = {};
    remainingSeconds = 600;
    persistProgress();
  }
  showView("quiz");
  renderQuestion();
  startTimer();
}
function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    persistProgress();
    if (remainingSeconds <= 0) submitQuiz(true);
  }, 1000);
}
function updateTimerDisplay() {
  const minutes = Math.floor(Math.max(0,remainingSeconds)/60);
  const seconds = Math.max(0,remainingSeconds)%60;
  $("timer").textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  $("timer").classList.toggle("urgent", remainingSeconds <= 60);
}
function renderQuestion() {
  const question = questions[currentIndex];
  if (!question) return;
  $("questionText").textContent = question.question;
  $("questionProgress").textContent = `Question ${currentIndex+1} of ${questions.length}`;
  const answeredCount = Object.keys(answers).filter(key => answers[key] !== undefined).length;
  $("answeredProgress").textContent = `${answeredCount} answered`;
  $("progressBar").style.width = `${((currentIndex+1)/questions.length)*100}%`;
  $("optionsList").innerHTML = "";
  question.options.forEach((option,index) => {
    const label = document.createElement("label");
    label.className = "option" + (answers[question.id] === index ? " selected" : "");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = index;
    input.checked = answers[question.id] === index;
    input.addEventListener("change", () => {
      answers[question.id] = index;
      persistProgress();
      renderQuestion();
    });
    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.textContent = String.fromCharCode(65+index);
    const text = document.createElement("span");
    text.textContent = option;
    label.append(input,letter,text);
    $("optionsList").appendChild(label);
  });
  $("previousBtn").disabled = currentIndex === 0;
  $("previousBtn").style.opacity = currentIndex === 0 ? ".45" : "1";
  $("nextBtn").classList.toggle("hidden", currentIndex === questions.length-1);
  $("submitBtn").classList.toggle("hidden", currentIndex !== questions.length-1);
  renderPalette();
}
function renderPalette() {
  const palette = $("questionPalette");
  palette.innerHTML = "";
  questions.forEach((question,index) => {
    const button = document.createElement("button");
    button.textContent = index+1;
    if (answers[question.id] !== undefined) button.classList.add("answered");
    if (index === currentIndex) button.classList.add("current");
    button.addEventListener("click", () => { currentIndex=index; persistProgress(); renderQuestion(); });
    palette.appendChild(button);
  });
}
function submitQuiz(timeUp=false) {
  if (!timeUp && !confirm("Are you sure you want to submit your quiz?")) return;
  clearInterval(timerInterval);
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  questions.forEach(question => {
    const selected = answers[question.id];
    if (selected === undefined) unanswered++;
    else if (selected === question.correct) correct++;
    else wrong++;
  });
  const percentage = Math.round((correct/questions.length)*100);
  lastResult = {
    id: Date.now(), date: new Date().toISOString(), total: questions.length,
    correct, wrong, unanswered, percentage,
    answers: {...answers},
    questionSnapshot: questions.map(q => ({...q,options:[...q.options]}))
  };
  history.unshift(lastResult);
  saveJSON(STORAGE_KEYS.history, history);
  clearProgress();
  renderResult(lastResult, timeUp);
  showView("result");
}
function renderResult(result,timeUp=false) {
  $("scorePercent").textContent = result.percentage+"%";
  $("scoreRing").style.background = `conic-gradient(var(--primary) ${result.percentage*3.6}deg,#ecebfa 0deg)`;
  $("resultTitle").textContent = result.percentage >= 80 ? "Excellent work!" : result.percentage >= 50 ? "Good effort!" : "Keep practicing!";
  $("resultMessage").textContent = timeUp ? "Time is up. Your answers were submitted automatically." : "Your result has been saved in this browser.";
  $("correctCount").textContent = result.correct;
  $("wrongCount").textContent = result.wrong;
  $("unansweredCount").textContent = result.unanswered;
  $("reviewArea").classList.add("hidden");
}
function renderReview() {
  if (!lastResult) return;
  const area = $("reviewArea");
  area.innerHTML = "<h2>Answer review</h2>";
  lastResult.questionSnapshot.forEach((question,index) => {
    const selected = lastResult.answers[question.id];
    const item = document.createElement("article");
    item.className = "review-item";
    const title = document.createElement("h3");
    title.textContent = `${index+1}. ${question.question}`;
    const your = document.createElement("p");
    your.textContent = "Your answer: " + (selected === undefined ? "Not answered" : question.options[selected]);
    your.className = selected === question.correct ? "correct-text" : "wrong-text";
    const correct = document.createElement("p");
    correct.className = "correct-text";
    correct.textContent = "Correct answer: " + question.options[question.correct];
    item.append(title,your,correct);
    area.appendChild(item);
  });
  area.classList.remove("hidden");
}
function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = '<div class="empty-state">No quiz attempts yet. Complete your first quiz to see your history here.</div>';
    return;
  }
  history.forEach(item => {
    const row = document.createElement("article");
    row.className = "history-item";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = "General Knowledge Quiz";
    const date = document.createElement("p");
    date.textContent = `${new Date(item.date).toLocaleString()} • ${item.correct}/${item.total} correct`;
    info.append(title,date);
    const score = document.createElement("span");
    score.className = "history-score";
    score.textContent = item.percentage+"%";
    row.append(info,score);
    list.appendChild(row);
  });
}
function renderAdminQuestions() {
  $("adminCount").textContent = questions.length;
  const list = $("adminQuestionList");
  list.innerHTML = "";
  if (!questions.length) {
    list.innerHTML = '<div class="empty-state">No questions added yet.</div>';
    return;
  }
  questions.forEach((question,index) => {
    const item = document.createElement("div");
    item.className = "admin-question";
    const title = document.createElement("strong");
    title.textContent = `${index+1}. ${question.question}`;
    const answer = document.createElement("small");
    answer.textContent = `Correct answer: ${question.options[question.correct]}`;
    const actions = document.createElement("div");
    actions.className = "admin-question-actions";
    const edit = document.createElement("button");
    edit.className = "mini-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click",()=>editQuestion(question.id));
    const remove = document.createElement("button");
    remove.className = "mini-btn delete";
    remove.textContent = "Delete";
    remove.addEventListener("click",()=>deleteQuestion(question.id));
    actions.append(edit,remove);
    item.append(title,answer,actions);
    list.appendChild(item);
  });
}
function resetQuestionForm() {
  $("questionForm").reset();
  $("editId").value = "";
  $("formTitle").textContent = "Add a question";
  $("saveQuestionBtn").textContent = "Save question";
  $("cancelEditBtn").classList.add("hidden");
}
function editQuestion(id) {
  const question = questions.find(q=>q.id===id);
  if (!question) return;
  $("editId").value = question.id;
  $("questionInput").value = question.question;
  $("optionA").value = question.options[0];
  $("optionB").value = question.options[1];
  $("optionC").value = question.options[2];
  $("optionD").value = question.options[3];
  $("correctInput").value = String(question.correct);
  $("formTitle").textContent = "Edit question";
  $("saveQuestionBtn").textContent = "Update question";
  $("cancelEditBtn").classList.remove("hidden");
  $("questionInput").focus();
  window.scrollTo({top:0,behavior:"smooth"});
}
function deleteQuestion(id) {
  if (!confirm("Delete this question?")) return;
  questions = questions.filter(q=>q.id!==id);
  saveJSON(STORAGE_KEYS.questions,questions);
  renderAdminQuestions();
  renderDashboard();
  showToast("Question deleted.");
}
$("questionForm").addEventListener("submit",event=>{
  event.preventDefault();
  const questionText = $("questionInput").value.trim();
  const options = [$("optionA").value.trim(),$("optionB").value.trim(),$("optionC").value.trim(),$("optionD").value.trim()];
  if (!questionText || options.some(option=>!option)) {
    showToast("Please fill in the question and all four options.");
    return;
  }
  const id = $("editId").value;
  if (id) {
    const index = questions.findIndex(q=>q.id===id);
    if (index !== -1) questions[index] = {id,question:questionText,options,correct:Number($("correctInput").value)};
    showToast("Question updated.");
  } else {
    questions.push({id:"q_"+Date.now(),question:questionText,options,correct:Number($("correctInput").value)});
    showToast("Question added.");
  }
  saveJSON(STORAGE_KEYS.questions,questions);
  resetQuestionForm();
  renderAdminQuestions();
  renderDashboard();
});
$("cancelEditBtn").addEventListener("click",resetQuestionForm);
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
$("brandHome").addEventListener("click",event=>{event.preventDefault();showView("home");});
$("startQuizBtn").addEventListener("click",startQuiz);
$("exitQuizBtn").addEventListener("click",()=>{
  if(confirm("Exit the quiz? Your progress will be saved so you can resume later.")){
    clearInterval(timerInterval);persistProgress();showView("home");
  }
});
$("previousBtn").addEventListener("click",()=>{if(currentIndex>0){currentIndex--;persistProgress();renderQuestion();}});
$("nextBtn").addEventListener("click",()=>{if(currentIndex<questions.length-1){currentIndex++;persistProgress();renderQuestion();}});
$("submitBtn").addEventListener("click",()=>submitQuiz(false));
$("submitSideBtn").addEventListener("click",()=>submitQuiz(false));
$("retryBtn").addEventListener("click",startQuiz);
$("reviewBtn").addEventListener("click",renderReview);
$("homeBtn").addEventListener("click",()=>showView("home"));
$("clearHistoryBtn").addEventListener("click",()=>{
  if(confirm("Delete all saved quiz history? This cannot be undone.")){
    history=[];saveJSON(STORAGE_KEYS.history,history);renderHistory();renderDashboard();showToast("Quiz history cleared.");
  }
});
renderDashboard();
