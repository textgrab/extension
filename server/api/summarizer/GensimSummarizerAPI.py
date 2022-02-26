from api.summarizer.SummarizerAPI import SummarizerAPI

import gensim
from gensim.summarization import summarize

# TextRank with Gensim
class GensimSummarizerAPI(SummarizerAPI):
    def __init__(self):
        return

    def get_summary(self, text):
        
        try:
            summary = summarize(text, ratio=0.3)
        # Input text is too short (< 2 sentences)
        # In this case, return back the original sentence
        except (ValueError):
            summary = text

        return summary
