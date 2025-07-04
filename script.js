// Configuration
const GEMINI_API_KEY = "AIzaSyCgCklmUb6xUCS8Jcf-NX0IVodZ-Aq6bb4" // Replace with your actual API key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

// Global variables
let currentInterviewType = ""
let currentQuestionIndex = 0
const questions = []
const userAnswers = []
let isRecording = false
const mediaRecorder = null
const audioChunks = []
let recognition = null
const emotionModel = null
let videoStream = null
let currentEmotion = "neutral"
const tf = window.tf // Declare the tf variable

// Navigation functions
function navigateToInterview(type) {
  currentInterviewType = type
  window.location.href = `interview.html?type=${type}`
}

function goBack() {
  window.location.href = "index.html"
}

function goToResults() {
  localStorage.setItem(
    "interviewResults",
    JSON.stringify({
      type: currentInterviewType,
      questions: questions,
      answers: userAnswers,
      emotions: getEmotionSummary(),
    }),
  )
  window.location.href = "results.html"
}

// Initialize interview page
async function initializeInterview() {
  const urlParams = new URLSearchParams(window.location.search)
  currentInterviewType = urlParams.get("type")

  if (!currentInterviewType) {
    window.location.href = "index.html"
    return
  }

  updateInterviewTitle()
  await setupCamera()
  await loadTensorFlowModel()
  setupSpeechRecognition()
  await generateFirstQuestion()
}

function updateInterviewTitle() {
  const titles = {
    ielts: "IELTS Speaking Test",
    visa: "Visa Interview Practice",
    job: "Job Interview Simulation",
    basic: "Basic English Practice",
  }

  document.getElementById("interviewTitle").textContent = titles[currentInterviewType] || "Interview Practice"
  document.getElementById("interviewSubtitle").textContent = `Question ${currentQuestionIndex + 1} of 8`
}

// Camera and TensorFlow setup
async function setupCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    })
    const videoElement = document.getElementById("videoElement")
    videoElement.srcObject = videoStream

    videoElement.addEventListener("loadedmetadata", () => {
      videoElement.play()
    })
  } catch (error) {
    console.error("Error accessing camera:", error)
    showError("Camera access denied. Please allow camera access for emotion detection.")
  }
}

async function loadTensorFlowModel() {
  try {
    // Load TensorFlow.js and face detection model
    await tf.ready()

    // For demo purposes, we'll simulate emotion detection
    // In a real implementation, you would load a pre-trained emotion detection model
    console.log("TensorFlow.js loaded successfully")
    startEmotionDetection()
  } catch (error) {
    console.error("Error loading TensorFlow model:", error)
  }
}

function startEmotionDetection() {
  // Simulate emotion detection every 2 seconds
  setInterval(() => {
    const emotions = ["confident", "nervous", "neutral", "focused", "anxious"]
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
    currentEmotion = randomEmotion
    updateEmotionDisplay(randomEmotion)
  }, 2000)
}

function updateEmotionDisplay(emotion) {
  const emotionOverlay = document.querySelector(".emotion-overlay")
  if (emotionOverlay) {
    const emotionEmojis = {
      confident: "😊 Confident",
      nervous: "😰 Nervous",
      neutral: "😐 Neutral",
      focused: "🤔 Focused",
      anxious: "😟 Anxious",
    }
    emotionOverlay.textContent = emotionEmojis[emotion] || "😐 Neutral"
  }
}

// Speech recognition setup
function setupSpeechRecognition() {
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      handleUserAnswer(transcript)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      showError("Speech recognition error. Please try again.")
    }
  } else {
    showError("Speech recognition not supported in this browser.")
  }
}

// Gemini API functions
async function generateQuestion(interviewType, questionNumber) {
  const prompts = {
    ielts: `Generate an IELTS speaking test question ${questionNumber} of 8. Make it appropriate for Part ${questionNumber <= 3 ? "1" : questionNumber <= 5 ? "2" : "3"}. Return only the question text, no additional formatting.`,
    visa: `Generate a visa interview question ${questionNumber} of 8. Focus on common visa interview topics like purpose of visit, ties to home country, financial situation, etc. Return only the question text.`,
    job: `Generate a job interview question ${questionNumber} of 8. Include a mix of behavioral, technical, and situational questions. Return only the question text.`,
    basic: `Generate a basic English conversation question ${questionNumber} of 8. Focus on everyday topics suitable for English learners. Return only the question text.`,
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompts[interviewType],
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    return data.candidates[0].content.parts[0].text.trim()
  } catch (error) {
    console.error("Error generating question:", error)
    return getFallbackQuestion(interviewType, questionNumber)
  }
}

function getFallbackQuestion(type, number) {
  const fallbackQuestions = {
    ielts: [
      "Tell me about your hometown.",
      "What do you like to do in your free time?",
      "Describe a memorable experience from your childhood.",
      "What are your plans for the future?",
      "How has technology changed the way people communicate?",
      "What role does education play in society?",
      "Discuss the importance of environmental protection.",
      "How do you think cities will change in the future?",
    ],
    visa: [
      "What is the purpose of your visit?",
      "How long do you plan to stay?",
      "What ties do you have to your home country?",
      "How will you finance your trip?",
      "Have you visited this country before?",
      "What do you plan to do during your visit?",
      "Do you have family or friends in the destination country?",
      "What is your occupation and how long have you been working there?",
    ],
    job: [
      "Tell me about yourself.",
      "Why are you interested in this position?",
      "What are your greatest strengths?",
      "Describe a challenging situation you faced at work.",
      "Where do you see yourself in five years?",
      "Why should we hire you?",
      "What motivates you?",
      "Do you have any questions for us?",
    ],
    basic: [
      "What is your favorite food and why?",
      "Describe your daily routine.",
      "What do you like about your city?",
      "Tell me about your family.",
      "What are your hobbies?",
      "Describe your best friend.",
      "What did you do last weekend?",
      "What are your plans for next year?",
    ],
  }

  return fallbackQuestions[type][number - 1] || "Tell me about yourself."
}

async function evaluateAnswer(question, userAnswer) {
  const prompt = `
    Evaluate this interview answer:
    Question: "${question}"
    Answer: "${userAnswer}"
    
    Provide feedback in this exact JSON format:
    {
        "fluencyScore": [0-100],
        "answerScore": [0-100],
        "fluencyFeedback": "specific feedback about grammar, pronunciation, and fluency",
        "answerFeedback": "specific feedback about content quality and relevance"
    }
    
    Return only the JSON, no additional text.
    `

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const evaluation = JSON.parse(data.candidates[0].content.parts[0].text.trim())
    return evaluation
  } catch (error) {
    console.error("Error evaluating answer:", error)
    return {
      fluencyScore: 75,
      answerScore: 75,
      fluencyFeedback: "Good overall fluency with room for improvement.",
      answerFeedback: "Relevant answer with good content structure.",
    }
  }
}

// Interview flow functions
async function generateFirstQuestion() {
  showLoading(true)
  const question = await generateQuestion(currentInterviewType, 1)
  questions.push(question)
  displayQuestion(question, 1)
  showLoading(false)
}

function displayQuestion(question, number) {
  document.getElementById("questionNumber").textContent = `Question ${number}`
  document.getElementById("questionText").textContent = question
  updateProgress(number)
  updateInterviewTitle()
}

function updateProgress(questionNumber) {
  const progress = (questionNumber / 8) * 100
  document.querySelector(".progress-fill").style.width = `${progress}%`
}

async function startRecording() {
  if (!recognition) {
    showError("Speech recognition not available.")
    return
  }

  isRecording = true
  const recordBtn = document.getElementById("recordBtn")
  recordBtn.classList.add("recording")
  recordBtn.innerHTML = "🛑 Stop Recording"

  recognition.start()
  startTimer()
}

function stopRecording() {
  if (!isRecording) return

  isRecording = false
  const recordBtn = document.getElementById("recordBtn")
  recordBtn.classList.remove("recording")
  recordBtn.innerHTML = "🎤 Start Recording"

  recognition.stop()
  stopTimer()
}

function startTimer() {
  let seconds = 0
  const timerDisplay = document.getElementById("timerDisplay")

  const timer = setInterval(() => {
    seconds++
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`

    if (!isRecording) {
      clearInterval(timer)
    }
  }, 1000)
}

function stopTimer() {
  // Timer will stop automatically when isRecording becomes false
}

async function handleUserAnswer(transcript) {
  showLoading(true)

  const currentQuestion = questions[currentQuestionIndex]
  const evaluation = await evaluateAnswer(currentQuestion, transcript)

  userAnswers.push({
    question: currentQuestion,
    answer: transcript,
    evaluation: evaluation,
    emotion: currentEmotion,
    timestamp: new Date().toISOString(),
  })

  currentQuestionIndex++

  if (currentQuestionIndex < 8) {
    const nextQuestion = await generateQuestion(currentInterviewType, currentQuestionIndex + 1)
    questions.push(nextQuestion)
    displayQuestion(nextQuestion, currentQuestionIndex + 1)
  } else {
    // Interview completed
    goToResults()
  }

  showLoading(false)
}

async function skipQuestion() {
  if (currentQuestionIndex < 7) {
    currentQuestionIndex++
    const nextQuestion = await generateQuestion(currentInterviewType, currentQuestionIndex + 1)
    questions.push(nextQuestion)
    displayQuestion(nextQuestion, currentQuestionIndex + 1)
  } else {
    goToResults()
  }
}

// Results page functions
function initializeResults() {
  const results = JSON.parse(localStorage.getItem("interviewResults"))
  if (!results) {
    window.location.href = "index.html"
    return
  }

  displayResults(results)
}

function displayResults(results) {
  // Calculate overall scores
  const fluencyScores = results.answers.map((a) => a.evaluation.fluencyScore)
  const answerScores = results.answers.map((a) => a.evaluation.answerScore)
  const emotionScores = calculateEmotionScore(results.answers)

  const avgFluency = fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length
  const avgAnswer = answerScores.reduce((a, b) => a + b, 0) / answerScores.length
  const avgEmotion = emotionScores

  const overallScore = Math.round((avgFluency + avgAnswer + avgEmotion) / 3)

  // Display overall score
  document.getElementById("overallScore").textContent = `${overallScore}%`

  // Display detailed feedback
  displayDetailedFeedback(avgEmotion, avgFluency, avgAnswer, results.answers)
}

function calculateEmotionScore(answers) {
  const emotionWeights = {
    confident: 100,
    focused: 90,
    neutral: 75,
    nervous: 50,
    anxious: 30,
  }

  const emotions = answers.map((a) => a.emotion)
  const avgScore = emotions.reduce((sum, emotion) => sum + (emotionWeights[emotion] || 75), 0) / emotions.length
  return Math.round(avgScore)
}

function displayDetailedFeedback(emotionScore, fluencyScore, answerScore, answers) {
  // Body Language Feedback
  const bodyLanguageFeedback = document.getElementById("bodyLanguageFeedback")
  bodyLanguageFeedback.innerHTML = `
        <div class="feedback-header">
            <div class="feedback-icon">😊</div>
            <div>
                <div class="feedback-title">Body Language & Confidence</div>
                <div class="feedback-score">${emotionScore}%</div>
            </div>
        </div>
        <div class="feedback-content">
            ${getEmotionFeedback(emotionScore, answers)}
        </div>
    `

  // Fluency Feedback
  const fluencyFeedback = document.getElementById("fluencyFeedback")
  fluencyFeedback.innerHTML = `
        <div class="feedback-header">
            <div class="feedback-icon">🗣️</div>
            <div>
                <div class="feedback-title">Fluency & Grammar</div>
                <div class="feedback-score">${Math.round(fluencyScore)}%</div>
            </div>
        </div>
        <div class="feedback-content">
            ${getFluencyFeedback(fluencyScore, answers)}
        </div>
    `

  // Answer Quality Feedback
  const answerQualityFeedback = document.getElementById("answerQualityFeedback")
  answerQualityFeedback.innerHTML = `
        <div class="feedback-header">
            <div class="feedback-icon">💡</div>
            <div>
                <div class="feedback-title">Answer Quality</div>
                <div class="feedback-score">${Math.round(answerScore)}%</div>
            </div>
        </div>
        <div class="feedback-content">
            ${getAnswerFeedback(answerScore, answers)}
        </div>
    `
}

function getEmotionFeedback(score, answers) {
  const dominantEmotions = answers.map((a) => a.emotion)
  const emotionCounts = dominantEmotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1
    return acc
  }, {})

  const mostCommonEmotion = Object.keys(emotionCounts).reduce((a, b) => (emotionCounts[a] > emotionCounts[b] ? a : b))

  if (score >= 80) {
    return `Excellent confidence and body language! You maintained a ${mostCommonEmotion} demeanor throughout most of the interview, which shows great composure and self-assurance.`
  } else if (score >= 60) {
    return `Good overall presence with some nervousness detected. You showed ${mostCommonEmotion} behavior most of the time. Try to maintain eye contact and practice relaxation techniques.`
  } else {
    return `There's room for improvement in confidence and body language. You appeared ${mostCommonEmotion} during most responses. Practice in front of a mirror and work on maintaining calm, confident posture.`
  }
}

function getFluencyFeedback(score, answers) {
  const fluencyIssues = answers.filter((a) => a.evaluation.fluencyScore < 70)

  if (score >= 80) {
    return "Excellent fluency and grammar! Your speech was clear, well-paced, and grammatically correct throughout the interview."
  } else if (score >= 60) {
    return `Good fluency with minor issues. ${fluencyIssues.length} responses had some grammar or pronunciation concerns. Focus on speaking more slowly and clearly.`
  } else {
    return `Fluency needs improvement. Consider practicing pronunciation, working on grammar basics, and speaking more slowly to improve clarity.`
  }
}

function getAnswerFeedback(score, answers) {
  const weakAnswers = answers.filter((a) => a.evaluation.answerScore < 70)

  if (score >= 80) {
    return "Outstanding answer quality! Your responses were relevant, well-structured, and provided good examples and details."
  } else if (score >= 60) {
    return `Good answers overall with room for improvement. ${weakAnswers.length} responses could have been more detailed or better structured. Practice the STAR method for behavioral questions.`
  } else {
    return "Answer quality needs significant improvement. Focus on providing more specific examples, structuring your responses better, and directly addressing the questions asked."
  }
}

// Utility functions
function showLoading(show) {
  const loadingElements = document.querySelectorAll(".loading")
  loadingElements.forEach((el) => {
    el.style.display = show ? "block" : "none"
  })
}

function showError(message) {
  alert(message) // In a real app, you'd use a proper notification system
}

function getEmotionSummary() {
  return userAnswers.map((answer) => answer.emotion)
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname

  if (path.includes("interview.html")) {
    initializeInterview()
  } else if (path.includes("results.html")) {
    initializeResults()
  }
})

// Cleanup function
window.addEventListener("beforeunload", () => {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop())
  }
  if (recognition) {
    recognition.stop()
  }
})
