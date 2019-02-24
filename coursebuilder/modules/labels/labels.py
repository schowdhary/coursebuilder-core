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


class CourseLabelEntity(entities.BaseEntity):
    """A class representing labels that can be applied to Course."""
    title = db.StringProperty(indexed=False)
    description = db.TextProperty(indexed=False)

    MEMCACHE_KEY = 'course_labels'

    def put(self):
        """Save the content to the datastore.

        To support caching the list of all labels, we must invalidate
        the cache on any change to any label.

        Returns:
          Value of entity as modified by put() (i.e., key setting)
        """

        result = super(CourseLabelEntity, self).put()
        models.MemcacheManager.delete(self.MEMCACHE_KEY)
        return result

    def delete(self):
        """Remove a label from the datastore.

        To support caching the list of all labels, we must invalidate
        the cache on any change to any label.
        """

        super(CourseLabelEntity, self).delete()
        models.MemcacheManager.delete(self.MEMCACHE_KEY)

    @classmethod
    def make(cls, title, description):
        entity = cls()
        entity.title = title
        entity.description = description
        return entity

    @classmethod
    def get_labels(cls):
        memcache_key = cls._cache_key()
        items = models.MemcacheManager.get(cls.MEMCACHE_KEY)
        if items is None:
            items = list(common_utils.iter_all(CourseLabelEntity.all()))

            # TODO(psimakov): prepare to exceed 1MB max item size
            # read more here: http://stackoverflow.com
            #   /questions/5081502/memcache-1-mb-limit-in-google-app-engine
            models.MemcacheManager.set(cls.MEMCACHE_KEY, items)
        return items

    @classmethod
    def _cache_key(cls):
        return cls.MEMCACHE_KEY



class LabelsHandlerMixin(object):
    def get_label_action_url(self, action, key=None):
        args = {'action':  action}
        if key:
            args['key'] = key
        return self.canonicalize_url(
            '{}?{}'.format(
                LabelsDashboardHandler.URL, urllib.urlencode(args)))

    def format_items_for_template(self, items):
        """Formats a list of entities into template values."""
        template_items = []
        for item in items:
            item = transforms.entity_to_dict(item)

            # add 'edit' actions
            item['edit_action'] = self.get_label_action_url(
                LabelsDashboardHandler.EDIT_ACTION, key=item['key'])

            item['delete_action'] = self.get_label_action_url(
                LabelsDashboardHandler.DELETE_ACTION,
                    key=item['key'])

            template_items.append(item)

        output = {}
        output['children'] = template_items

        # add 'add' action
        output['add_xsrf_token'] = self.create_xsrf_token(
                LabelsDashboardHandler.ADD_ACTION)
        output['add_action'] = self.get_label_action_url(
            LabelsDashboardHandler.ADD_ACTION)

        return output

class LabelsDashboardHandler(
        LabelsHandlerMixin, dashboard.DashboardHandler):
    """Handler for labels."""

    LIST_ACTION = 'list_course_labels'
    EDIT_ACTION = 'edit_course_label'
    DELETE_ACTION = 'delete_course_label'
    ADD_ACTION = 'add_course_label'
    DEFAULT_TITLE_TEXT = 'New Label'

    get_actions = [LIST_ACTION, EDIT_ACTION]
    post_actions = [ADD_ACTION, DELETE_ACTION]

    LINK_URL = 'list_course_labels'
    URL = '/{}'.format(LINK_URL)
    LIST_URL = '{}?action={}'.format(LINK_URL, LIST_ACTION)

    @classmethod
    def get_child_routes(cls):
        """Add child handlers for REST."""
        return [
            (LabelsItemRESTHandler.URL, LabelsItemRESTHandler)]

    def get_list_course_labels(self):
        """Shows a list of labels."""
        items = CourseLabelEntity.get_labels()

        main_content = self.get_template(
            'labels_list.html', [TEMPLATE_DIR]).render({
                'labels': self.format_items_for_template(items),

            })

        self.render_page({
            'page_title': self.format_title('Labels'),
            'main_content': jinja2.utils.Markup(main_content)})


    def post_add_course_label(self):
        """Adds a new label and redirects to an editor for it."""
        entity = CourseLabelEntity.make(self.DEFAULT_TITLE_TEXT, '')
        entity.put()

        self.redirect(self.get_label_action_url(
            self.EDIT_ACTION, key=entity.key()))

    def get_edit_course_label(self):
        """Shows an editor for label."""
        key = self.request.get('key')

        schema = LabelsItemRESTHandler.SCHEMA()

        print "Shikha"

        exit_url = self.canonicalize_url('/{}'.format(self.LIST_URL))
        rest_url = self.canonicalize_url('/rest/labels/item')
        form_html = oeditor.ObjectEditor.get_html_for(
            self,
            schema.get_json_schema(),
            schema.get_schema_dict(),
            key, rest_url, exit_url,
            delete_method='delete',
            delete_message='Are you sure you want to delete this label?',
            delete_url=self._get_delete_url(
                LabelsItemRESTHandler.URL, key, 'label-delete'),
            display_types=schema.get_display_types())

        self.render_page({
            'main_content': form_html,
            'page_title': 'Edit Labels',
        }, in_action=self.LIST_ACTION)


    def post_delete_course_label(self):
        """Deletes an label."""
        key = self.request.get('key')
        entity = CourseLabelEntity.get(key)
        if entity:
            entity.delete()
        self.redirect('/{}'.format(self.LIST_URL))

class LabelsItemRESTHandler(utils.BaseRESTHandler):
    """Provides REST API for an label."""

    URL = '/rest/labels/item'

    ACTION = 'label-put'

    @classmethod
    def SCHEMA(cls):
        schema = schema_fields.FieldRegistry('Label',
            extra_schema_dict_values={
                'className': 'inputEx-Group new-form-layout'})
        schema.add_property(schema_fields.SchemaField(
            'key', 'ID', 'string', editable=False, hidden=True))
        schema.add_property(schema_fields.SchemaField(
            'title', 'Title', 'string',
            description=messages.LABEL_TITLE))
        schema.add_property(schema_fields.SchemaField(
            'description', 'Description', 'string',
            description=messages.LABEL_DESCRIPTION,
            extra_schema_dict_values={
                'supportCustomTags': tags.CAN_USE_DYNAMIC_TAGS.value,
                'excludedCustomTags': tags.EditorBlacklists.COURSE_SCOPE},
            optional=True))
        return schema

    def get(self):
        """Handles REST GET verb and returns an object as JSON payload."""
        key = self.request.get('key')

        try:
            entity = CourseLabelEntity.get(key)
        except db.BadKeyError:
            entity = None

        if not entity:
            transforms.send_json_response(
                self, 404, 'Object not found.', {'key': key})
            return

        schema = LabelsItemRESTHandler.SCHEMA()

        entity_dict = transforms.entity_to_dict(entity)

        json_payload = transforms.dict_to_json(entity_dict)
        transforms.send_json_response(
            self, 200, 'Success.',
            payload_dict=json_payload,
            xsrf_token=crypto.XsrfTokenManager.create_xsrf_token(self.ACTION))
    

    def put(self):
        """Handles REST PUT verb with JSON payload."""
        request = transforms.loads(self.request.get('request'))
        key = request.get('key')

        if not self.assert_xsrf_token_or_fail(
                request, self.ACTION, {'key': key}):
            return

        entity = CourseLabelEntity.get(key)
        if not entity:
            transforms.send_json_response(
                self, 404, 'Object not found.', {'key': key})
            return

        schema = LabelsItemRESTHandler.SCHEMA()

        payload = request.get('payload')
        update_dict = transforms.json_to_dict(
            transforms.loads(payload), schema.get_json_schema_dict())

        del update_dict['key']  # Don't overwrite key member method in entity.
        transforms.dict_to_entity(entity, update_dict)

        entity.put()

        transforms.send_json_response(self, 200, 'Saved.')

    def delete(self):
        """Deletes an label."""
        key = self.request.get('key')

        if not self.assert_xsrf_token_or_fail(
                self.request, 'label-delete', {'key': key}):
            return

        entity = CourseLabelEntity.get(key)
        if not entity:
            transforms.send_json_response(
                self, 404, 'Object not found.', {'key': key})
            return

        entity.delete()

        transforms.send_json_response(self, 200, 'Deleted.')


custom_module = None

def register_module():
    """Registers this module in the registry."""
    global_routes=[]

    namespace_routes=[(LabelsDashboardHandler.URL,LabelsDashboardHandler)]

    dashboard.DashboardHandler.add_sub_nav_mapping(
        'analytics', MODULE_NAME, MODULE_TITLE,
        action=LabelsDashboardHandler.LIST_ACTION,
        href=LabelsDashboardHandler.LIST_URL,
        placement=1001, sub_group_name='pinned')

    global custom_module  # pylint: disable=global-statement
    custom_module = custom_modules.Module(
        MODULE_TITLE,
        'A set of pages for managing course labels.',
        global_routes , namespace_routes , notify_module_enabled=None)
    return custom_module
