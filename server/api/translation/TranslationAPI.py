from abc import ABC, abstractmethod

class TranslationAPI(ABC):
    """
    Abstract class for translation API
    """

    @abstractmethod
    def get_translation(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Returns the image labels
        :param image_path:
        :return:
        """
        pass
