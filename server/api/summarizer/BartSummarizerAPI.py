from api.summarizer.SummarizerAPI import SummarizerAPI
from transformers import BartForConditionalGeneration, BartTokenizer, BartConfig

# BART Summarization
class BartSummarizerAPI(SummarizerAPI):
    def __init__(self):
        self.tokenizer = BartTokenizer.from_pretrained('facebook/bart-large-cnn')
        self.model = BartForConditionalGeneration.from_pretrained(
            'facebook/bart-large-cnn')
        return

    def get_summary(self, text):
        # Encode the text and run summary
        inputs = self.tokenizer.batch_encode_plus( [text], return_tensors='pt')
        summary_ids = self.model.generate(inputs['input_ids'], early_stopping=True)

        # Decoding and printing the summary
        bart_summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        print("Summary:", bart_summary)
        return bart_summary






