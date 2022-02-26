from transformers import T5Tokenizer, T5Config, T5ForConditionalGeneration
from api.summarizer.SummarizerAPI import SummarizerAPI

# BART Summarization
class T5SummarizerAPI(SummarizerAPI):
    def __init__(self):
        self.model = T5ForConditionalGeneration.from_pretrained('t5-small')
        self.tokenizer = T5Tokenizer.from_pretrained('t5-small')
        return
    def get_summary(self, text):
        text = "summarize:" + text

        # encode input text
        input_ids = self.tokenizer.encode(text, return_tensors='pt', max_length=512)

        # Generating summary ids
        summary_ids = self.model.generate(input_ids)

        # Decode tensor and get summary
        t5_summary = self.tokenizer.decode(summary_ids[0])
        return t5_summary
