import dedupe
import os

from django.conf import settings

from datetime import datetime

CURRENT_GAZETTEER = None


def train_gazetteer(messy, canonical):
    """
    Train and return a dedupe.Gazetteer using the specified messy and canonical
    dictionaries. The messy and canonical objects should have the same
    structure:
      - The key is a unique ID
      - The value is another dictionary of field:value pairs. This dictionary
        must contain at least 'country', 'name', and 'address' keys.

    Reads a training.json file containing positive and negative matches.
    """
    settings_file = os.path.join(settings.BASE_DIR, 'api', 'data',
                                 'gazetteer_model_settings')
    if os.path.exists(settings_file):
        with open(settings_file, 'rb') as sf:
            gazetteer = dedupe.StaticGazetteer(sf)
    else:
        fields = [
            {'field': 'country', 'type': 'Exact'},
            {'field': 'name', 'type': 'String'},
            {'field': 'address', 'type': 'String'},
        ]

        gazetteer = dedupe.Gazetteer(fields)
        gazetteer.sample(messy, canonical, 15000)
        training_file = os.path.join(settings.BASE_DIR, 'api', 'data',
                                     'training.json')
        with open(training_file) as tf:
            gazetteer.readTraining(tf)
        training_start = datetime.now()
        gazetteer.train()
        training_duration = datetime.now() - training_start
        print('training_duration ', training_duration)

        with open(settings_file, 'wb') as sf:
            gazetteer.writeSettings(sf)

    index_start = datetime.now()
    gazetteer.index(canonical)
    index_duration = datetime.now() - index_start
    print('index_duration ', index_duration)

    if isinstance(gazetteer, dedupe.Gazetteer):
        gazetteer.cleanupTraining()
        # The gazetteer example in the dedupeio/dedupe-examples repository
        # called index both after training and after calling cleanupTraining.
        gazetteer.index(canonical)

    return gazetteer
