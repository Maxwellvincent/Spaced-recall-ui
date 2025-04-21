import OpenAI from 'openai';
import { useState, useEffect, use } from "react";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resolvedParams = use(params);

const foundSubject = subjects.find((s: Subject) => s.name === resolvedParams.subjectName);

const [newSubject, setNewSubject] = useState({
  name: resolvedParams.subjectName,
  description: "",
  studyStyle: "spaced-repetition",
  customStudyStyle: "",
  examMode: false,
});

useEffect(() => {
  // This useEffect block is empty, but it's kept as per the original code
}, [user, resolvedParams.subjectName]); 