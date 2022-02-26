from api.translation.TranslationAPI import TranslationAPI
from google.cloud import translate
from config import Config

# # See all languages here: https://cloud.google.com/translate/docs/languages
# # TODO: Need to map language names to language codes
# # frontend can also handle the mapping and send the proper lang code to the backend
# LANG_MAPPING = {
#     "English": "en",
#     "Spanish": "es",
#     "French": "fr",
#     "Chinese (Simplified)": "zh-CN",
#     "Chinese (Traditional)": "zh-TW",
#     "Hindi": "hi"
# }

class GoogleTranslateAPI(TranslationAPI):
    def __init__(self):
        self.client = translate.TranslationServiceClient()
        location = "global" # location of the translation endpoint
        self.parent = f"projects/{Config.PROJECT_ID}/locations/{location}"

    def get_translation(self, text: str, source_lang: str, target_lang: str) -> str:

        data = {
            'contents': [text],
            'parent': self.parent,
            'mime_type': "text/plain",
            'source_language_code': source_lang,
            'target_language_code': target_lang,
        }
        rsp = self.client.translate_text(request=data)
        return rsp.translations[0].translated_text
