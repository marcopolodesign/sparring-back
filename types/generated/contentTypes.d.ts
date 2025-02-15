import type { Schema, Attribute } from '@strapi/strapi';

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Attribute.String;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    registrationToken: Attribute.String & Attribute.Private;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    preferedLanguage: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    alternativeText: Attribute.String;
    caption: Attribute.String;
    width: Attribute.Integer;
    height: Attribute.Integer;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    ext: Attribute.String;
    mime: Attribute.String & Attribute.Required;
    size: Attribute.Decimal & Attribute.Required;
    url: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    singularName: 'release';
    pluralName: 'releases';
    displayName: 'Release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    timezone: Attribute.String;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    singularName: 'release-action';
    pluralName: 'release-actions';
    displayName: 'Release Action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    contentType: Attribute.String & Attribute.Required;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    isEntryValid: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginStrapiGoogleAuthGoogleCredential
  extends Schema.SingleType {
  collectionName: 'strapi-google-auth_google-credential';
  info: {
    displayName: 'Google Credentials';
    singularName: 'google-credential';
    pluralName: 'google-credentials';
    description: 'Stores google project credentials';
    tableName: 'google_auth_creds';
  };
  options: {
    privateAttributes: ['id', 'created_at'];
    populateCreatorFields: true;
    draftAndPublish: true;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    google_client_id: Attribute.String & Attribute.Required;
    google_client_secret: Attribute.String & Attribute.Required;
    google_redirect_url: Attribute.String & Attribute.Required;
    google_scopes: Attribute.JSON & Attribute.Required;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::strapi-google-auth.google-credential',
      'oneToOne',
      'admin::user'
    >;
    updatedBy: Attribute.Relation<
      'plugin::strapi-google-auth.google-credential',
      'oneToOne',
      'admin::user'
    >;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          min: 1;
          max: 50;
        },
        number
      >;
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Attribute.String;
    type: Attribute.String & Attribute.Unique;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    profilePicture: Attribute.Media;
    firstName: Attribute.String;
    lastName: Attribute.String;
    description: Attribute.String;
    address: Attribute.String;
    friends_added: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'plugin::users-permissions.user'
    >;
    friends_received: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'plugin::users-permissions.user'
    >;
    coach: Attribute.Boolean;
    tournaments: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'api::tournament.tournament'
    >;
    attributes: Attribute.Component<'attributes.attributes', true>;
    date_of_birth: Attribute.Date;
    document: Attribute.BigInteger;
    phone: Attribute.String;
    matches: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'api::match.match'
    >;
    expo_pushtoken: Attribute.String;
    nivel: Attribute.String;
    court_pos: Attribute.String;
    good_hand: Attribute.String;
    club: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'api::club.club'
    >;
    reservations: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::reservation.reservation'
    >;
    transactions: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::transaction.transaction'
    >;
    sales: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::transaction.transaction'
    >;
    gender: Attribute.Enumeration<['male', 'female']>;
    level: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::player-level.player-level'
    >;
    zones: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::zone.zone'
    >;
    match_history: Attribute.String;
    wins: Attribute.Integer;
    looses: Attribute.Integer;
    best_streak: Attribute.Integer;
    current_streak: Attribute.Integer;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiClientCustomPriceClientCustomPrice
  extends Schema.CollectionType {
  collectionName: 'client_custom_prices';
  info: {
    singularName: 'client-custom-price';
    pluralName: 'client-custom-prices';
    displayName: 'Client Custom Price';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    product: Attribute.Relation<
      'api::client-custom-price.client-custom-price',
      'oneToOne',
      'api::product.product'
    >;
    custom_ammount: Attribute.Decimal;
    venue: Attribute.Relation<
      'api::client-custom-price.client-custom-price',
      'manyToOne',
      'api::court.court'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::client-custom-price.client-custom-price',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::client-custom-price.client-custom-price',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiClubClub extends Schema.CollectionType {
  collectionName: 'clubs';
  info: {
    singularName: 'club';
    pluralName: 'clubs';
    displayName: 'Club';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    name: Attribute.String;
    venues: Attribute.Relation<
      'api::club.club',
      'oneToMany',
      'api::court.court'
    >;
    users_permissions_users: Attribute.Relation<
      'api::club.club',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::club.club', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::club.club', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiCourtCourt extends Schema.CollectionType {
  collectionName: 'courts';
  info: {
    singularName: 'court';
    pluralName: 'courts';
    displayName: 'Venues';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    name: Attribute.String;
    gallery: Attribute.Media;
    location: Attribute.Component<'location.location'>;
    available_sports: Attribute.Component<'sports.sport', true>;
    amenities: Attribute.Component<'ammenities.ammenities', true>;
    cover: Attribute.Media;
    tournaments: Attribute.Relation<
      'api::court.court',
      'oneToMany',
      'api::tournament.tournament'
    >;
    whatsapp: Attribute.String;
    opening_hours: Attribute.String;
    est_pricing: Attribute.String;
    tracks: Attribute.Relation<
      'api::court.court',
      'oneToMany',
      'api::track.track'
    >;
    club: Attribute.Relation<'api::court.court', 'manyToOne', 'api::club.club'>;
    logo: Attribute.Media;
    custom_prices: Attribute.Relation<
      'api::court.court',
      'oneToMany',
      'api::client-custom-price.client-custom-price'
    >;
    is_premium: Attribute.Boolean;
    zone: Attribute.Relation<'api::court.court', 'oneToOne', 'api::zone.zone'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::court.court',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::court.court',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiGeneralZoneGeneralZone extends Schema.CollectionType {
  collectionName: 'general_zones';
  info: {
    singularName: 'general-zone';
    pluralName: 'general-zones';
    displayName: 'GeneralZone';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    zones: Attribute.Relation<
      'api::general-zone.general-zone',
      'oneToMany',
      'api::zone.zone'
    >;
    name: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::general-zone.general-zone',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::general-zone.general-zone',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMatchMatch extends Schema.CollectionType {
  collectionName: 'matches';
  info: {
    singularName: 'match';
    pluralName: 'matches';
    displayName: 'Matches';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Date: Attribute.DateTime;
    location: Attribute.Component<'location.location'>;
    match_owner: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    description: Attribute.String;
    sport: Attribute.Component<'sports.sport'>;
    ammount_players: Attribute.Integer;
    member_1: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    member_2: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    member_3: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    member_4: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    couples: Attribute.Component<'couple.couple', true>;
    members: Attribute.Relation<
      'api::match.match',
      'manyToMany',
      'plugin::users-permissions.user'
    >;
    tournament: Attribute.Relation<
      'api::match.match',
      'manyToMany',
      'api::tournament.tournament'
    >;
    accepted_levels: Attribute.Relation<
      'api::match.match',
      'oneToMany',
      'api::player-level.player-level'
    >;
    zone: Attribute.Relation<'api::match.match', 'oneToOne', 'api::zone.zone'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::match.match',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPlayerLevelPlayerLevel extends Schema.CollectionType {
  collectionName: 'player_levels';
  info: {
    singularName: 'player-level';
    pluralName: 'player-levels';
    displayName: 'Player Level';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Category: Attribute.String;
    Level: Attribute.Integer;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::player-level.player-level',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::player-level.player-level',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiProductProduct extends Schema.CollectionType {
  collectionName: 'products';
  info: {
    singularName: 'product';
    pluralName: 'products';
    displayName: 'Product';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Name: Attribute.String;
    type: Attribute.Enumeration<['alquiler', 'producto']>;
    price: Attribute.Decimal;
    sku: Attribute.String;
    custom_price: Attribute.Relation<
      'api::product.product',
      'oneToMany',
      'api::client-custom-price.client-custom-price'
    >;
    venues: Attribute.Relation<
      'api::product.product',
      'oneToMany',
      'api::court.court'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::product.product',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::product.product',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiReservationReservation extends Schema.CollectionType {
  collectionName: 'reservations';
  info: {
    singularName: 'reservation';
    pluralName: 'reservations';
    displayName: 'Reservations';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    owner: Attribute.Relation<
      'api::reservation.reservation',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    date: Attribute.Date;
    start_time: Attribute.Time;
    end_time: Attribute.Time;
    status: Attribute.Enumeration<
      ['pending_payment', 'confirmed', 'cancelled']
    >;
    duration: Attribute.Integer;
    court: Attribute.Relation<
      'api::reservation.reservation',
      'manyToOne',
      'api::track.track'
    >;
    type: Attribute.Enumeration<
      ['abono', 'alquiler', 'armado', 'clase', 'torneo']
    >;
    products: Attribute.Relation<
      'api::reservation.reservation',
      'oneToMany',
      'api::product.product'
    >;
    transactions: Attribute.Relation<
      'api::reservation.reservation',
      'oneToMany',
      'api::transaction.transaction'
    >;
    seller: Attribute.Relation<
      'api::reservation.reservation',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    coach: Attribute.Relation<
      'api::reservation.reservation',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    venue: Attribute.Relation<
      'api::reservation.reservation',
      'oneToOne',
      'api::court.court'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::reservation.reservation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::reservation.reservation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTournamentTournament extends Schema.CollectionType {
  collectionName: 'tournaments';
  info: {
    singularName: 'tournament';
    pluralName: 'tournaments';
    displayName: 'Tournament';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    start_date: Attribute.Date;
    end_date: Attribute.Date;
    location: Attribute.Component<'location.location', true>;
    sport: Attribute.Component<'sports.sport', true>;
    name: Attribute.String;
    description: Attribute.String;
    participants: Attribute.Relation<
      'api::tournament.tournament',
      'manyToMany',
      'plugin::users-permissions.user'
    >;
    matches: Attribute.Relation<
      'api::tournament.tournament',
      'manyToMany',
      'api::match.match'
    >;
    sponsors: Attribute.Media;
    cover: Attribute.Media;
    logo: Attribute.Media;
    venue: Attribute.Relation<
      'api::tournament.tournament',
      'manyToOne',
      'api::court.court'
    >;
    registration_deadline: Attribute.Date;
    title: Attribute.Text;
    groups: Attribute.Component<'groups-tournament.groups-tournament', true>;
    details: Attribute.Component<'details.details'>;
    golden_cup: Attribute.Component<'cup.cup'>;
    silver_cup: Attribute.Component<'cup.cup'>;
    gender: Attribute.Enumeration<['Masculino', 'Femenino', 'Mixto']>;
    accepted_levels: Attribute.Relation<
      'api::tournament.tournament',
      'oneToMany',
      'api::player-level.player-level'
    >;
    ranking: Attribute.Component<'members.ranking', true>;
    ranking_test: Attribute.Component<'ranking.ranking-test', true>;
    main_sponsors: Attribute.Media;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::tournament.tournament',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::tournament.tournament',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTrackTrack extends Schema.CollectionType {
  collectionName: 'tracks';
  info: {
    singularName: 'track';
    pluralName: 'tracks';
    displayName: 'Tracks';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    name: Attribute.String;
    venue: Attribute.Relation<
      'api::track.track',
      'manyToOne',
      'api::court.court'
    >;
    reservations: Attribute.Relation<
      'api::track.track',
      'oneToMany',
      'api::reservation.reservation'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::track.track',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::track.track',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTransactionTransaction extends Schema.CollectionType {
  collectionName: 'transactions';
  info: {
    singularName: 'transaction';
    pluralName: 'transactions';
    displayName: 'Transaction';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    reservation: Attribute.Relation<
      'api::transaction.transaction',
      'manyToOne',
      'api::reservation.reservation'
    >;
    client: Attribute.Relation<
      'api::transaction.transaction',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    amount: Attribute.Decimal;
    payment_method: Attribute.Enumeration<
      ['cash', 'credit_card', 'bank_transfer', 'gateway-mp', 'gateway-stripe']
    >;
    date: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['Pending', 'Completed', 'Failed', 'Refunded', 'Cancelled']
    >;
    original_transaction: Attribute.String;
    discounts: Attribute.Decimal;
    source: Attribute.Enumeration<
      ['app', 'front-web', 'sparring-club', 'mostrador', 'whatsapp']
    >;
    notes: Attribute.Text;
    payment_details: Attribute.JSON;
    seller: Attribute.Relation<
      'api::transaction.transaction',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    products: Attribute.Relation<
      'api::transaction.transaction',
      'oneToMany',
      'api::product.product'
    >;
    venue: Attribute.Relation<
      'api::transaction.transaction',
      'oneToOne',
      'api::court.court'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::transaction.transaction',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::transaction.transaction',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiZoneZone extends Schema.CollectionType {
  collectionName: 'zones';
  info: {
    singularName: 'zone';
    pluralName: 'zones';
    displayName: 'Zone';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    general_zone: Attribute.Relation<
      'api::zone.zone',
      'manyToOne',
      'api::general-zone.general-zone'
    >;
    location: Attribute.Component<'location.location', true>;
    name: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::zone.zone', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::zone.zone', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::permission': AdminPermission;
      'admin::user': AdminUser;
      'admin::role': AdminRole;
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::strapi-google-auth.google-credential': PluginStrapiGoogleAuthGoogleCredential;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'api::client-custom-price.client-custom-price': ApiClientCustomPriceClientCustomPrice;
      'api::club.club': ApiClubClub;
      'api::court.court': ApiCourtCourt;
      'api::general-zone.general-zone': ApiGeneralZoneGeneralZone;
      'api::match.match': ApiMatchMatch;
      'api::player-level.player-level': ApiPlayerLevelPlayerLevel;
      'api::product.product': ApiProductProduct;
      'api::reservation.reservation': ApiReservationReservation;
      'api::tournament.tournament': ApiTournamentTournament;
      'api::track.track': ApiTrackTrack;
      'api::transaction.transaction': ApiTransactionTransaction;
      'api::zone.zone': ApiZoneZone;
    }
  }
}
