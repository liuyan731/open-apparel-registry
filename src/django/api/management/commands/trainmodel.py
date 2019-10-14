#TEMP
import dedupe

import io
import logging
import os

from datetime import datetime
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Matcher
from api.matching import (get_messy_items_for_training,
                          get_canonical_items,
                          train_gazetteer,
                          clean)

logger = logging.getLogger(__name__)


@transaction.atomic
def save_settings(model_settings):
    Matcher.objects \
           .update(is_active=False)
    Matcher.objects.create(
        is_active=True,
        model_settings=model_settings)


class Command(BaseCommand):
    help = ('Train a new Dedupe model and save it as a `Matcher`. '
            'Set `is_active` to True for the new `Matcher` and False for all '
            'others')

    def handle(self, *args, **options):
        messy = get_messy_items_for_training()
        logger.info('Training with {} messy items'.format(len(messy.keys())))

        canonical = get_canonical_items()
        logger.info('Training with {} canonical items'.format(
            len(canonical.keys())))

        ## TEMP
        # print('LOADING')
        # matcher = Matcher.objects.filter(is_active=True).first()
        # new_messy = {'key': {
        #     'country': clean('VN'),
        #     'name': clean('Regina Miracle International'),
        #     'address': clean('No.9,East West Road,VSIP Hai Phong,Thuy Nguyen District,Dinh Vu-Cat Hai EZ')}}
        # messy.update(new_messy)
        # import sys
        # settings_file = os.path.join(
        #     settings.BASE_DIR, 'api', 'data',
        #     'gazetteer_model_settings_indexed')
        # with open(settings_file, 'rb') as sf:
        #     gazetteer = train_gazetteer(
        #         messy,
        #         canonical,
        #         # model_settings=io.BytesIO(matcher.model_settings),
        #         model_settings=sf,
        #         should_index=False)

        ## TEMP 2 - dump settings with index
        # sys.setrecursionlimit(10000)
        # with open(settings_file, 'wb') as sf:
        #     gazetteer.writeSettings(sf, index=True)
        ## END TEMP 2

        # print('THRESHOLDING')
        # gazetteer.threshold(new_messy)
        # start_match = datetime.now()
        # results = gazetteer.match(new_messy, threshold=0.5, n_matches=None)
        # print(results)
        # print('Match took {}'.format(datetime.now() - start_match))

        # start_index = datetime.now()
        # print('indexing a facility')
        # gazetteer.index({
        #     'second': {
        #         'country': clean('US'),
        #         'name': clean('Shirts shirts shirts'),
        #         'address': clean('1234 main st, atlanta Ga'),
        #     }
        # })
        # print('Index took {}'.format(datetime.now() - start_index))

        # start_match = datetime.now()
        # results = gazetteer.match({
        #     'third': {
        #         'country': clean('US'),
        #         'name': clean('Shirts shirts (shirts)'),
        #         'address': clean('1234 main street unit 1 atlanta'),
        #     }
        # }, threshold=0.5, n_matches=None)
        # print(results)
        # print('Match took {}'.format(datetime.now() - start_match))

        # sys.exit(0)

        ## END TEMP

        logger.info('Start training')
        start_time = datetime.now()
        gazetteer = train_gazetteer(messy, canonical, should_index=False)
        logger.info(
            'Finished training ({})'.format(datetime.now() - start_time))

        model_settings_stream = io.BytesIO()
        gazetteer.writeSettings(model_settings_stream)
        model_settings_stream.seek(0)
        logger.info(
            'Settings size in bytes: {}'.format(
                model_settings_stream.getbuffer().nbytes))
        save_settings(model_settings_stream.read())
