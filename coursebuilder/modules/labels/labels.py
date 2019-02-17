# Copyright 2012 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Classes and methods to create and manage Labels."""

__author__ = 'Shikha Chowdhary (shikhachowdhary28@gmail.com)'


import cgi
import collections
import datetime
import os
import urllib

import jinja2

import appengine_config
from common import crypto
from common import tags
from common import utils as common_utils
from common import schema_fields
from common import resource
from common import utc
from controllers import sites
from controllers import utils
from models import resources_display
from models import courses
from models import custom_modules
from models import entities
from models import models
from models import roles
from models import transforms
from modules.labels import messages
from modules.dashboard import dashboard
from modules.i18n_dashboard import i18n_dashboard
from modules.news import news
from modules.oeditor import oeditor

from google.appengine.ext import db

MODULE_NAME = 'labels'
MODULE_TITLE = 'Labels'
TEMPLATE_DIR = os.path.join(
    appengine_config.BUNDLE_ROOT, 'modules', MODULE_NAME, 'templates')


custom_module = None

def register_module():
    """Registers this module in the registry."""

    dashboard.DashboardHandler.add_sub_nav_mapping(
        'analytics', MODULE_NAME, MODULE_TITLE,
        action='edit_labels',
        href='edit_labels',
        placement=1001, sub_group_name='pinned')

    global custom_module  # pylint: disable=global-statement
    custom_module = custom_modules.Module(
        MODULE_TITLE,
        'A set of pages for managing course labels.',
        [], [], notify_module_enabled=None)
    return custom_module
