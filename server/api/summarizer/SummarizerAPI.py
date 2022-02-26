from abc import ABC, abstractmethod

class SummarizerAPI(ABC):
    """
    Abstract class for summarization API
    """
    @abstractmethod
    def get_summary(self, input_str: str) -> str:
        """
        Returns the image labels
        :param image_path:
        :return:
        """
        pass
