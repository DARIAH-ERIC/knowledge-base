export interface paths {
    "/api/workflows/{persistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single workflow by its persistentId */
        get: operations["getWorkflow"];
        /** Updating workflow for given persistentId */
        put: operations["updateWorkflow"];
        post?: never;
        /** Delete workflow by its persistentId */
        delete: operations["deleteWorkflow"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/versions/{versionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert workflow to target version by its persistentId and versionId that is reverted to */
        put: operations["revertWorkflow"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single step by its persistentId and workflow persistentId */
        get: operations["getStep"];
        /** Updated step for given persistentId and workflow persistentId */
        put: operations["updateStep"];
        post?: never;
        /** Delete step by its persistentId and workflow persistentId */
        delete: operations["deleteStep"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/versions/{stepVersionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert step to target version by its persistentId and versionId that is reverted to */
        put: operations["revertStep"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert workflow by its persistentId. This method will set its status to ACTIVE and its versioned item to REVIEWED status and active state. */
        put: operations["revertWorkflow_1"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{vocabulary-code}/concepts/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get concept for given vocabulary code and concept code */
        get: operations["getConcept"];
        /** Update concept for given vocabulary code and concept code */
        put: operations["updateConcept"];
        post?: never;
        /** Delete concept for given vocabulary code and concept code */
        delete: operations["deleteConcept"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{vocabulary-code}/concepts/{code}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Commit concept for given vocabulary code and concept code */
        put: operations["commitConcept"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get vocabulary for given code */
        get: operations["getVocabulary"];
        /** Update vocabulary for given code and file */
        put: operations["updateVocabulary"];
        post?: never;
        /** Delete vocabulary for given code */
        delete: operations["deleteVocabulary"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{code}/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Open the given vocabulary to new concepts */
        put: operations["openVocabulary"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{code}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Close the given vocabulary to new concepts */
        put: operations["closeVocabulary"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/status/{userStatus}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update user status for given user */
        put: operations["updateUserStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/role/{userRole}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update user role for given user */
        put: operations["updateUserRole"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update password for given user */
        put: operations["updateUserPassword"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}/display-name": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update displayed name for given user */
        put: operations["updateUserDisplayName"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single training material by its persistentId */
        get: operations["getTrainingMaterial"];
        /** Updating training material for given persistentId */
        put: operations["updateTrainingMaterial"];
        post?: never;
        /** Delete training material by its persistentId */
        delete: operations["deleteTrainingMaterial"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/versions/{versionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert training material to target version by its persistentId and versionId that is reverted to */
        put: operations["revertTrainingMaterial"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert training material by its persistentId. This method will set its status to ACTIVE and its versioned item to REVIEWED status and active state. */
        put: operations["revertTrainingMaterial_1"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single tool by its persistentId */
        get: operations["getTool"];
        /** Updating tool for given persistentId */
        put: operations["updateTool"];
        post?: never;
        /** Delete tool by its persistentId */
        delete: operations["deleteTool"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/versions/{versionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert tool to target version by its persistentId and versionId that is reverted to */
        put: operations["revertTool"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert tool by its persistentId. This method will set its status to ACTIVE and its versioned item to REVIEWED status and active state. */
        put: operations["revertTool_1"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sources/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getSource"];
        put: operations["updateSource"];
        post?: never;
        delete: operations["deleteSource"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single publication by its persistentId */
        get: operations["getPublication"];
        /** Updating publication for given persistentId */
        put: operations["updatePublication"];
        post?: never;
        /** Delete publication by its persistentId */
        delete: operations["deletePublication"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/versions/{versionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert publication to target version by its persistentId and versionId that is reverted to */
        put: operations["revertPublication"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert publication by its persistentId. This method will set its status to ACTIVE and its versioned item to REVIEWED status and active state. */
        put: operations["revertPublication_1"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/property-types/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get property type by code */
        get: operations["getPropertyType"];
        /** Update property type by code */
        put: operations["updatePropertyType"];
        post?: never;
        /** Delete property type by code */
        delete: operations["deletePropertyType"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/oauth/token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["validateImplicitGrantToken"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/oauth/sign-up": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Sign-up */
        put: operations["registerOAuth2User"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media-sources/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting single media source for given media source code */
        get: operations["getMediaSource"];
        /** Updating media source for given media source code */
        put: operations["updateMediaSource"];
        post?: never;
        /** Deleting media source for given media source code */
        delete: operations["deleteMediaSource"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items/{itemId}/comments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update comment for given comment id and itemId */
        put: operations["updateItemComment"];
        post?: never;
        /** Delete comment for given comment id and itemId */
        delete: operations["deleteItemComment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items-relations/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single type of relation between items by its code */
        get: operations["getItemRelation"];
        /** Update a type of relation between items */
        put: operations["updateItemRelation"];
        post?: never;
        /** Delete a type of relation between items by its code */
        delete: operations["deleteItemRelation"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-sources/{sourceCode}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get item sources for given source code */
        get: operations["getItemSource"];
        /** Update item sources for given source code */
        put: operations["updateItemSource"];
        post?: never;
        /** Delete item sources for given source code */
        delete: operations["deleteItemSource"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-reindex": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["reindexItems"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-autocomplete-rebuild": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["rebuildAutocompleteIndex"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get single dataset by its persistentId */
        get: operations["getDataset"];
        /** Updating dataset for given persistentId */
        put: operations["updateDataset"];
        post?: never;
        /** Delete dataset by its persistentId */
        delete: operations["deleteDataset"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/versions/{versionId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert dataset to target version by its persistentId and versionId that is reverted to */
        put: operations["revertDataset"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/revert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Revert dataset by its persistentId. This method will set its status to ACTIVE and its versioned item to REVIEWED status and active state. */
        put: operations["revertDataset_1"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/concept-reindex": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["reindexConcepts"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actors/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get actor given by id with optional list of items that actor contributes to */
        get: operations["getActor"];
        put: operations["updateActor"];
        post?: never;
        /** Delete actor by given id. Force delete can be used by administrators only. */
        delete: operations["deleteActor"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-sources/{sourceCode}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve single actor sources by source code */
        get: operations["getActorSource"];
        put: operations["updateActorSource"];
        post?: never;
        /** Delete actor sources by source code */
        delete: operations["deleteActorSource"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-roles/{roleCode}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get actor role by role code */
        get: operations["getActorRole"];
        put: operations["updateActorRole"];
        post?: never;
        /** Delete actor role by given role code */
        delete: operations["deleteActorRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-reindex": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["reindexActors"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all workflows in pages */
        get: operations["getWorkflows"];
        put?: never;
        /** Creating workflow */
        post: operations["createWorkflow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Creating step for given persistentId and workflow persistentId */
        post: operations["createStep"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/steps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Creating substep for given persistentId and workflow persistentId */
        post: operations["createSubstep"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merge into step */
        post: operations["mergeStep"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Committing draft of workflow by its persistentId */
        post: operations["publishWorkflow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merge into workflow */
        post: operations["mergeWorkflow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all vocabularies in pages */
        get: operations["getVocabularies"];
        put?: never;
        /** Create vocabulary from file */
        post: operations["createVocabulary"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{vocabulary-code}/concepts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create concept for given vocabulary code */
        post: operations["createConcept"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{vocabulary-code}/concepts/{code}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Merge concepts */
        post: operations["mergeConcepts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all users in pages */
        get: operations["getUsers"];
        put?: never;
        /** Create new user */
        post: operations["createUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all training materials in pages */
        get: operations["getTrainingMaterials"];
        put?: never;
        /** Creating training material */
        post: operations["createTrainingMaterial"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Committing draft of training material by its persistentId */
        post: operations["publishTrainingMaterial"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merge into training material */
        post: operations["mergeTrainingMaterial"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all tools services in pages */
        get: operations["getTools"];
        put?: never;
        /** Creating tool */
        post: operations["createTool"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Committing draft of tool by its persistentId */
        post: operations["publishTool"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merge into tool */
        post: operations["mergeTool"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getSources"];
        put?: never;
        post: operations["createSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all publications in pages */
        get: operations["getPublications"];
        put?: never;
        /** Creating publication */
        post: operations["createPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Committing draft of publication by its persistentId */
        post: operations["publishPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merged into publication */
        post: operations["mergePublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/property-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all property types in pages */
        get: operations["getPropertyTypes"];
        put?: never;
        /** Create property type */
        post: operations["createPropertyType"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/property-types/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reorganize property type order */
        post: operations["reorderPropertyTypes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/upload/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload media via link (import) */
        post: operations["importMedia"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/upload/full": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload full media file */
        post: operations["uploadMedia"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/upload/complete/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Complete uploading chunks for media file */
        post: operations["completeMediaUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/upload/chunk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload full media file chunk (part) */
        post: operations["uploadMediaChunk"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of all media sources */
        get: operations["getAllMediaSources"];
        put?: never;
        /** Creating media source */
        post: operations["createMediaSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items/{itemId}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all comments for given item */
        get: operations["getComments"];
        put?: never;
        /** Create comment for given itemId */
        post: operations["createItemComment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items-relations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all types of relations between items */
        get: operations["getItemRelations"];
        put?: never;
        /** Create new type of relation between items */
        post: operations["createItemRelation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items-relations/{subjectId}/{objectId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create an instance of relation between items specified by subject id and object id */
        post: operations["createItemRelatedItem"];
        /** Delete an instance of relation between items specified by subject id and object id */
        delete: operations["deleteItemRelatedItem"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get list of all item sources */
        get: operations["getAllItemSources"];
        put?: never;
        /** Create item sources */
        post: operations["createItemSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve all datasets in pages */
        get: operations["getDatasets"];
        put?: never;
        /** Creating dataset */
        post: operations["createDataset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Committing draft of dataset by its persistentId */
        post: operations["publishDataset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Performing merge into dataset */
        post: operations["mergeDataset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sign-in": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sign into the system */
        post: operations["signIn"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get list of actors in pages */
        get: operations["getActors"];
        put?: never;
        post: operations["createActor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actors/{id}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Merge of actors */
        post: operations["mergeActor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieve list of all actor sources */
        get: operations["getAllActorSources"];
        put?: never;
        post: operations["createActorSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all roles of actor */
        get: operations["getAllActorRoles"];
        put?: never;
        post: operations["createActorRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/oauth2/authorize/eosc": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Sign into the system using oauth2 */
        get: operations["oauth2"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get workflow selected version by its persistentId and versionId */
        get: operations["getWorkflowVersion"];
        put?: never;
        post?: never;
        /** Delete workflow by its persistentId and versionId */
        delete: operations["deleteWorkflowVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/versions/{versionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of workflow by its persistentId and versionId */
        get: operations["getWorkflowVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of workflow and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedWorkflowAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of step and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedStepAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/versions/{stepVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get step selected version by its persistentId, versionId and workflow persistentId */
        get: operations["getStepVersion"];
        put?: never;
        post?: never;
        /** Delete step by its persistentId, versionId and workflow persistentId */
        delete: operations["deleteStepVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/versions/{stepVersionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of step by its persistentId, versionId and workflow persistentId */
        get: operations["getStepVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of step by its persistentId and workflow persistentId */
        get: operations["getStepSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of step with its workflow persistentId */
        get: operations["getStepMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of step by its persistentId and workflow persistentId */
        get: operations["getStepInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of step by its persistentId and workflow persistentId */
        get: operations["getStepHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/steps/{stepPersistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between step and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getStepAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of workflow by its persistentId */
        get: operations["getWorkflowSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of workflow */
        get: operations["getWorkflowMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of workflow by its persistentId */
        get: operations["getWorkflowInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of workflow by its persistentId */
        get: operations["getWorkflowHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workflows/{persistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between workflow and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getWorkflowAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/vocabularies/{code}/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get vocabulary for given code in SKOS TURTLE format */
        get: operations["exportVocabulary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get user by id */
        get: operations["getUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get training material selected version by its persistentId and versionId */
        get: operations["getTrainingMaterialVersion"];
        put?: never;
        post?: never;
        /** Delete training material by its persistentId and versionId */
        delete: operations["deleteTrainingMaterialVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/versions/{versionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of training material by its persistentId and versionId */
        get: operations["getTrainingMaterialVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of training material and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedTrainingMaterialAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of training material by its persistentId */
        get: operations["getTrainingMaterialSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of training material */
        get: operations["getTrainingMaterialMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of training material by its persistentId */
        get: operations["getTrainingMaterialInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of training material by its persistentId */
        get: operations["getTrainingMaterialHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-materials/{persistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between training material and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getTrainingMaterialAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get tool selected version by its persistentId and versionId */
        get: operations["getToolVersion"];
        put?: never;
        post?: never;
        /** Delete tool by its persistentId and versionId */
        delete: operations["deleteToolVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/versions/{versionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of tool by its persistentId and versionId */
        get: operations["getToolVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of tool and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedToolAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of tool by its persistentId */
        get: operations["getToolSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of tool */
        get: operations["getToolMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of tool by its persistentId */
        get: operations["getToolInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of tool by its persistentId */
        get: operations["getToolHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tools-services/{persistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between tool and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getToolAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sources/{sourceId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get list of items for given source */
        get: operations["getItemsForSource"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sources/{sourceId}/items/{sourceItemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get list of items for given source and id of an item in this source */
        get: operations["getItemsForSourceAndSourceItemId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get publication selected version by its persistentId and versionId */
        get: operations["getPublicationVersion"];
        put?: never;
        post?: never;
        /** Delete publication by its persistentId and versionId */
        delete: operations["deletePublicationVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/versions/{versionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of publication by its persistentId and versionId */
        get: operations["getPublicationVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of publication and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedPublicationAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of publication by its persistentId */
        get: operations["getPublicationSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of publication */
        get: operations["getPublicationMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of publication by its persistentId */
        get: operations["getPublicationInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of publication by its persistentId */
        get: operations["getPublicationHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/publications/{persistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between publication and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getPublicationAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/thumbnail/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get thumbnail for given media id */
        get: operations["getMediaThumbnail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/info/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get information about given media id */
        get: operations["getMediaInfo"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/media/download/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download media for given media id */
        get: operations["getMediaFile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items/{itemId}/last-comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get last updated comment of item */
        get: operations["getLastComments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/items-categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List item categories */
        get: operations["getItemCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Search among items. */
        get: operations["searchItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/item-search/autocomplete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Autocomplete for items search. */
        get: operations["autocompleteItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/draft-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all draft-items available in pages */
        get: operations["getMyDraftItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/deleted-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all deleted-items available in pages */
        get: operations["getDeletedItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get dataset selected version by its persistentId and versionId */
        get: operations["getDatasetVersion"];
        put?: never;
        post?: never;
        /** Delete dataset by its persistentId and versionId */
        delete: operations["deleteDatasetVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/versions/{versionId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors to the selected version of dataset by its persistentId and versionId */
        get: operations["getDatasetVersionInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/versions/{versionId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between target version of dataset and target version of item ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getVersionedDatasetAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting list of sources of dataset by its persistentId */
        get: operations["getDatasetSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting body of merged version of dataset */
        get: operations["getDatasetMerge"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/information-contributors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving list of information-contributors across the whole history of dataset by its persistentId */
        get: operations["getDatasetInformationContributors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Retrieving history of dataset by its persistentId */
        get: operations["getDatasetHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/datasets/{persistentId}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Getting differences between dataset and target version of item, ('unaltered' string response means for the single field that remained unchanged) */
        get: operations["getDatasetAndVersionedItemDifferences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/contributed-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all contributed-items available in pages */
        get: operations["getContributedItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/concept-search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Search among concepts. */
        get: operations["searchConcepts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/concept-relations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get list of all concepts relations */
        get: operations["getAllConceptRelations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getLoggedInUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actors/{id}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** History of actor */
        get: operations["getActorHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/actor-search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Search among actors. */
        get: operations["searchActors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/oai-pmh/oai-pmh-repository.xml": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["handle"];
        put: operations["handle_3"];
        post: operations["handle_2"];
        delete: operations["handle_5"];
        options: operations["handle_6"];
        head: operations["handle_1"];
        patch: operations["handle_4"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ActorId: {
            /** Format: int64 */
            id?: number;
        };
        ActorRoleId: {
            code?: string;
        };
        ConceptId: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyId"];
            uri?: string;
        };
        ItemContributorId: {
            actor?: components["schemas"]["ActorId"];
            role?: components["schemas"]["ActorRoleId"];
        };
        ItemExternalIdCore: {
            identifierService: components["schemas"]["ItemExternalIdId"];
            identifier: string;
        };
        ItemExternalIdId: {
            code?: string;
        };
        ItemMediaCore: {
            info?: components["schemas"]["MediaDetailsId"];
            caption?: string;
            concept?: components["schemas"]["ConceptId"];
        };
        ItemRelationId: {
            code?: string;
        };
        MediaDetailsId: {
            /** Format: uuid */
            mediaId?: string;
        };
        PropertyCore: {
            type: components["schemas"]["PropertyTypeId"];
            value?: string;
            concept?: components["schemas"]["ConceptId"];
        };
        PropertyTypeId: {
            code?: string;
        };
        RelatedItemCore: {
            persistentId: string;
            relation?: components["schemas"]["ItemRelationId"];
        };
        SourceId: {
            /** Format: int64 */
            id?: number;
        };
        VocabularyId: {
            code?: string;
        };
        /** @description Merged workflow */
        WorkflowCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
        };
        ActorDto: {
            /** Format: int64 */
            id?: number;
            name?: string;
            externalIds?: components["schemas"]["ActorExternalIdDto"][];
            website?: string;
            email?: string;
            affiliations?: components["schemas"]["ActorDto"][];
            items?: components["schemas"]["ItemBasicDto"][];
        };
        ActorExternalIdDto: {
            identifierService?: components["schemas"]["ActorSourceDto"];
            identifier?: string;
        };
        ActorRoleDto: {
            code?: string;
            label?: string;
            /** Format: int32 */
            ord?: number;
        };
        ActorSourceDto: {
            code?: string;
            label?: string;
            /** Format: int32 */
            ord?: number;
            urlTemplate?: string;
        };
        ConceptBasicDto: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyBasicDto"];
            label?: string;
            notation?: string;
            definition?: string;
            uri?: string;
            candidate?: boolean;
        };
        ItemBasicDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
        };
        ItemContributorDto: {
            actor?: components["schemas"]["ActorDto"];
            role?: components["schemas"]["ActorRoleDto"];
        };
        ItemExternalIdDto: {
            identifierService?: components["schemas"]["ItemSourceDto"];
            identifier?: string;
        };
        ItemMediaDto: {
            info?: components["schemas"]["MediaDetails"];
            caption?: string;
            concept?: components["schemas"]["ConceptBasicDto"];
        };
        ItemRelationDto: {
            code?: string;
            label?: string;
            inverseOf?: string;
        };
        ItemSourceDto: {
            code?: string;
            label?: string;
            /** Format: int32 */
            ord?: number;
            urlTemplate?: string;
        };
        MediaDetails: {
            /** Format: uuid */
            mediaId?: string;
            /** @enum {string} */
            category?: "image" | "video" | "embed" | "object" | "thumbnail";
            location?: components["schemas"]["MediaLocation"];
            filename?: string;
            mimeType?: string;
            hasThumbnail?: boolean;
        };
        /** @description Media location */
        MediaLocation: {
            /** Format: url */
            sourceUrl?: string;
        };
        PropertyDto: {
            type?: components["schemas"]["PropertyTypeDto"];
            value?: string;
            concept?: components["schemas"]["ConceptBasicDto"];
        };
        PropertyTypeDto: {
            code?: string;
            label?: string;
            /** @enum {string} */
            type?: "concept" | "string" | "url" | "int" | "float" | "date" | "boolean";
            groupName?: string;
            hidden?: boolean;
            /** Format: int32 */
            ord?: number;
            allowedVocabularies?: components["schemas"]["VocabularyBasicDto"][];
        };
        RelatedItemDto: {
            /** Format: int64 */
            id?: number;
            persistentId?: string;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            description?: string;
            relation?: components["schemas"]["ItemRelationDto"];
        };
        SourceBasicDto: {
            /** Format: int64 */
            id?: number;
            label?: string;
            url?: string;
            urlTemplate?: string;
        };
        StepDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
        };
        UserDto: {
            /** Format: int64 */
            id?: number;
            username?: string;
            displayName?: string;
            /** @enum {string} */
            status?: "during-registration" | "enabled" | "locked";
            /** @example 2000-02-29T20:02:00+0000 */
            registrationDate?: string;
            /** @enum {string} */
            role?: "contributor" | "system-contributor" | "moderator" | "system-moderator" | "administrator";
            email?: string;
            config?: boolean;
        };
        VocabularyBasicDto: {
            code?: string;
            scheme?: string;
            namespace?: string;
            label?: string;
            accessibleAt?: string;
            closed?: boolean;
        };
        WorkflowDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
            composedOf?: components["schemas"]["StepDto"][];
        };
        /** @description Merged step */
        StepCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
            /** Format: int32 */
            stepNo?: number;
        };
        /** @description Created concept */
        ConceptCore: {
            code: string;
            label: string;
            notation?: string;
            definition?: string;
            uri?: string;
            relatedConcepts?: components["schemas"]["RelatedConceptCore"][];
        };
        ConceptRelationId: {
            code?: string;
        };
        RelatedConceptCore: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyId"];
            uri?: string;
            relation?: components["schemas"]["ConceptRelationId"];
        };
        ConceptDto: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyBasicDto"];
            label?: string;
            notation?: string;
            definition?: string;
            uri?: string;
            candidate?: boolean;
            relatedConcepts?: components["schemas"]["RelatedConceptDto"][];
        };
        ConceptRelationDto: {
            code?: string;
            label?: string;
        };
        RelatedConceptDto: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyBasicDto"];
            label?: string;
            notation?: string;
            definition?: string;
            uri?: string;
            relation?: components["schemas"]["ConceptRelationDto"];
            candidate?: boolean;
        };
        /** @description Update user password */
        NewPasswordData: {
            newPassword?: string;
            verifiedPassword?: string;
            currentPassword?: string;
        };
        /** @description Update user display name */
        UserDisplayNameCore: {
            displayName?: string;
        };
        /** @description Merged training material */
        TrainingMaterialCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        TrainingMaterialDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        /** @description Performing merge into tool */
        ToolCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
        };
        ToolDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
        };
        /** @description Created source */
        SourceCore: {
            label: string;
            url: string;
            urlTemplate: string;
        };
        SourceDto: {
            /** Format: int64 */
            id?: number;
            label?: string;
            url?: string;
            urlTemplate?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastHarvestedDate?: string;
        };
        /** @description Merged publication */
        PublicationCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        PublicationDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        /** @description Created property type */
        PropertyTypeCore: {
            code: string;
            label?: string;
            /** @enum {string} */
            type?: "concept" | "string" | "url" | "int" | "float" | "date" | "boolean";
            groupName?: string;
            hidden?: boolean;
            /** Format: int32 */
            ord?: number;
            allowedVocabularies?: string[];
        };
        /** @description Authorization */
        ImplicitGrantTokenData: {
            token?: string;
            registration?: boolean;
        };
        OAuthRegistrationDto: {
            /** Format: int64 */
            id?: number;
            displayName?: string;
            email?: string;
        };
        /** @description Sign-up */
        OAuthRegistrationData: {
            /** Format: int64 */
            id?: number;
            displayName?: string;
            email?: string;
            acceptedRegulations?: boolean;
        };
        /** @description Created media source */
        MediaSourceCore: {
            code?: string;
            serviceUrl?: string;
            /** @enum {string} */
            mediaCategory?: "image" | "video" | "embed" | "object" | "thumbnail";
            /** Format: int32 */
            ord?: number;
        };
        MediaSourceDto: {
            code?: string;
            serviceUrl?: string;
            /** @enum {string} */
            mediaCategory?: "image" | "video" | "embed" | "object" | "thumbnail";
            /** Format: int32 */
            ord?: number;
        };
        /** @description Created comment */
        ItemCommentCore: {
            body?: string;
        };
        ItemCommentDto: {
            /** Format: int64 */
            id?: number;
            body?: string;
            creator?: components["schemas"]["UserDto"];
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        /** @description New type of relation */
        ItemRelationCore: {
            code?: string;
            label?: string;
            inverseOf?: string;
            /** Format: int32 */
            ord?: number;
        };
        /** @description Created item source */
        ItemSourceCore: {
            code?: string;
            label: string;
            /** Format: int32 */
            ord?: number;
            urlTemplate?: string;
        };
        /** @description Merged dataset */
        DatasetCore: {
            label: string;
            version?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorId"][];
            externalIds?: components["schemas"]["ItemExternalIdCore"][];
            properties?: components["schemas"]["PropertyCore"][];
            relatedItems?: components["schemas"]["RelatedItemCore"][];
            media?: components["schemas"]["ItemMediaCore"][];
            thumbnail?: components["schemas"]["ItemMediaCore"];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceId"];
            sourceItemId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        DatasetDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
            /** @example 2000-02-29T20:02:00+0000 */
            dateCreated?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            dateLastUpdated?: string;
        };
        /** @description Created actor object */
        ActorCore: {
            name: string;
            externalIds?: components["schemas"]["ActorExternalIdCore"][];
            website?: string;
            email?: string;
            affiliations?: components["schemas"]["ActorId"][];
        };
        ActorExternalIdCore: {
            identifierService: components["schemas"]["ActorSourceId"];
            identifier: string;
        };
        ActorSourceId: {
            code?: string;
        };
        /** @description Created actor source object */
        ActorSourceCore: {
            code?: string;
            label: string;
            /** Format: int32 */
            ord?: number;
            urlTemplate?: string;
        };
        /** @description Created actor role object */
        ActorRoleCore: {
            code?: string;
            label: string;
            /** Format: int32 */
            ord?: number;
        };
        /** @description Created user */
        UserCore: {
            username: string;
            displayName?: string;
            password: string;
            /** @enum {string} */
            role?: "contributor" | "system-contributor" | "moderator" | "system-moderator" | "administrator";
            email: string;
        };
        PropertyTypeReorder: {
            code: string;
            /** Format: int32 */
            ord?: number;
        };
        /** @description Reordered property type */
        PropertyTypesReordering: {
            shifts: components["schemas"]["PropertyTypeReorder"][];
        };
        MediaUploadInfo: {
            /** Format: uuid */
            mediaId?: string;
            filename?: string;
            mimeType?: string;
            /** Format: int32 */
            nextChunkNo?: number;
        };
        ItemRelatedItemDto: {
            subject?: components["schemas"]["ItemBasicDto"];
            object?: components["schemas"]["ItemBasicDto"];
            relation?: components["schemas"]["ItemRelationDto"];
        };
        LoginData: {
            username?: string;
            password?: string;
        };
        PaginatedWorkflows: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            workflows?: components["schemas"]["WorkflowDto"][];
        };
        ItemDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            externalIds?: components["schemas"]["ItemExternalIdDto"][];
            accessibleAt?: string[];
            source?: components["schemas"]["SourceBasicDto"];
            sourceItemId?: string;
            relatedItems?: components["schemas"]["RelatedItemDto"][];
            media?: components["schemas"]["ItemMediaDto"][];
            thumbnail?: components["schemas"]["ItemMediaDto"];
        };
        ItemsDifferencesDtoItemDtoItemDto: {
            item?: components["schemas"]["ItemDto"];
            equal?: boolean;
            other?: components["schemas"]["ItemDto"];
        };
        ItemExtBasicDto: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            persistentId?: string;
            /** @example 2000-02-29T20:02:00+0000 */
            lastInfoUpdate?: string;
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            informationContributor?: components["schemas"]["UserDto"];
        };
        PaginatedVocabularies: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            vocabularies?: components["schemas"]["VocabularyBasicDto"][];
        };
        PaginatedConcepts: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            concepts?: components["schemas"]["ConceptDto"][];
        };
        VocabularyDto: {
            code?: string;
            scheme?: string;
            namespace?: string;
            label?: string;
            accessibleAt?: string;
            closed?: boolean;
            description?: string;
            conceptResults?: components["schemas"]["PaginatedConcepts"];
        };
        StreamingResponseBody: Record<string, never>;
        PaginatedUsers: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            users?: components["schemas"]["UserDto"][];
        };
        PaginatedTrainingMaterials: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            trainingMaterials?: components["schemas"]["TrainingMaterialDto"][];
        };
        PaginatedTools: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            tools?: components["schemas"]["ToolDto"][];
        };
        PaginatedSources: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            sources?: components["schemas"]["SourceDto"][];
        };
        PaginatedItemsBasicItemBasicDto: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            items?: components["schemas"]["ItemBasicDto"][];
        };
        PaginatedPublications: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            publications?: components["schemas"]["PublicationDto"][];
        };
        PaginatedPropertyTypes: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            propertyTypes?: components["schemas"]["PropertyTypeDto"][];
        };
        PaginatedItemRelation: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            itemRelations?: components["schemas"]["ItemRelationDto"][];
        };
        CheckedCount: {
            /** Format: int64 */
            count?: number;
            checked?: boolean;
        };
        LabeledCheckedCount: {
            /** Format: int64 */
            count?: number;
            checked?: boolean;
            label?: string;
        };
        PaginatedSearchItems: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            q?: string;
            order?: ("score" | "label" | "modified-on")[];
            items?: components["schemas"]["SearchItem"][];
            categories?: {
                [key: string]: components["schemas"]["LabeledCheckedCount"];
            };
            facets?: {
                [key: string]: {
                    [key: string]: components["schemas"]["CheckedCount"];
                };
            };
        };
        SearchItem: {
            /** Format: int64 */
            id?: number;
            persistentId?: string;
            /** @enum {string} */
            category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            label?: string;
            version?: string;
            lastInfoUpdate?: string;
            description?: string;
            contributors?: components["schemas"]["ItemContributorDto"][];
            properties?: components["schemas"]["PropertyDto"][];
            /** @enum {string} */
            status?: "draft" | "ingested" | "suggested" | "approved" | "disapproved" | "deprecated";
            owner?: string;
            accessibleAt?: string[];
            thumbnailId?: string;
        };
        SuggestedObject: {
            phrase?: string;
            persistentId?: string;
        };
        SuggestedSearchPhrases: {
            phrase?: string;
            suggestions?: components["schemas"]["SuggestedObject"][];
        };
        PaginatedDatasets: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            datasets?: components["schemas"]["DatasetDto"][];
        };
        PaginatedItemsBasicItemExtBasicDto: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            items?: components["schemas"]["ItemExtBasicDto"][];
        };
        CountedPropertyType: {
            code?: string;
            label?: string;
            /** Format: int64 */
            count?: number;
            checked?: boolean;
        };
        PaginatedSearchConcepts: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            q?: string;
            concepts?: components["schemas"]["SearchConcept"][];
            types?: {
                [key: string]: components["schemas"]["CountedPropertyType"];
            };
            facets?: {
                [key: string]: {
                    [key: string]: components["schemas"]["CheckedCount"];
                };
            };
        };
        SearchConcept: {
            code?: string;
            vocabulary?: components["schemas"]["VocabularyId"];
            label?: string;
            notation?: string;
            definition?: string;
            uri?: string;
            types?: components["schemas"]["PropertyTypeId"][];
            candidate?: boolean;
        };
        PaginatedActors: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            actors?: components["schemas"]["ActorDto"][];
        };
        ActorHistoryDto: {
            /** Format: int64 */
            id: number;
            actor?: components["schemas"]["ActorCore"];
            /** Format: date-time */
            dateCreated?: string;
            history?: string;
        };
        PaginatedSearchActor: {
            /** Format: int64 */
            hits?: number;
            /** Format: int32 */
            count?: number;
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perpage?: number;
            /** Format: int32 */
            pages?: number;
            q?: string;
            actors?: components["schemas"]["SearchActor"][];
        };
        SearchActor: {
            /** Format: int64 */
            id?: number;
            name?: string;
            externalIds?: components["schemas"]["ActorExternalIdDto"][];
            website?: string;
            email?: string;
            affiliations?: components["schemas"]["ActorDto"][];
        };
        MultiValueMapStringString: {
            all?: {
                [key: string]: string;
            };
            empty?: boolean;
        } & {
            [key: string]: string[];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getWorkflow: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    updateWorkflow: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    deleteWorkflow: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertWorkflow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    getStep: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    updateStep: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StepCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    deleteStep: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertStep: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
                stepVersionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    revertWorkflow_1: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    getConcept: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                "vocabulary-code": string;
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConceptDto"];
                };
            };
        };
    };
    updateConcept: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                "vocabulary-code": string;
                code: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConceptCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConceptDto"];
                };
            };
        };
    };
    deleteConcept: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                "vocabulary-code": string;
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    commitConcept: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                "vocabulary-code": string;
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConceptDto"];
                };
            };
        };
    };
    getVocabulary: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VocabularyDto"];
                };
            };
        };
    };
    updateVocabulary: {
        parameters: {
            query?: {
                force?: boolean;
                closed?: boolean;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    ttl: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VocabularyBasicDto"];
                };
            };
        };
    };
    deleteVocabulary: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    openVocabulary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VocabularyBasicDto"];
                };
            };
        };
    };
    closeVocabulary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VocabularyBasicDto"];
                };
            };
        };
    };
    updateUserStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                userStatus: "during-registration" | "enabled" | "locked";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    updateUserRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                userRole: "contributor" | "system-contributor" | "moderator" | "system-moderator" | "administrator";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    updateUserPassword: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewPasswordData"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    updateUserDisplayName: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserDisplayNameCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    getTrainingMaterial: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    updateTrainingMaterial: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TrainingMaterialCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    deleteTrainingMaterial: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertTrainingMaterial: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    revertTrainingMaterial_1: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    getTool: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    updateTool: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToolCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    deleteTool: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertTool: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    revertTool_1: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    getSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"];
                };
            };
        };
    };
    updateSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"];
                };
            };
        };
    };
    deleteSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublication: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    updatePublication: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    deletePublication: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    revertPublication_1: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    getPropertyType: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PropertyTypeDto"];
                };
            };
        };
    };
    updatePropertyType: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PropertyTypeCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PropertyTypeDto"];
                };
            };
        };
    };
    deletePropertyType: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "*/*": components["schemas"]["PropertyTypeDto"];
                };
            };
        };
    };
    validateImplicitGrantToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImplicitGrantTokenData"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OAuthRegistrationDto"];
                };
            };
        };
    };
    registerOAuth2User: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthRegistrationData"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    getMediaSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaSourceDto"];
                };
            };
        };
    };
    updateMediaSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MediaSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaSourceDto"];
                };
            };
        };
    };
    deleteMediaSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateItemComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemCommentCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemCommentDto"];
                };
            };
        };
    };
    deleteItemComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getItemRelation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemRelationDto"];
                };
            };
        };
    };
    updateItemRelation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemRelationCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemRelationDto"];
                };
            };
        };
    };
    deleteItemRelation: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getItemSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemSourceDto"];
                };
            };
        };
    };
    updateItemSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemSourceDto"];
                };
            };
        };
    };
    deleteItemSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    reindexItems: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    rebuildAutocompleteIndex: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getDataset: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
                redirect?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    updateDataset: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DatasetCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    deleteDataset: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    revertDataset: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    revertDataset_1: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    reindexConcepts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getActor: {
        parameters: {
            query?: {
                items?: boolean;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorDto"];
                };
            };
        };
    };
    updateActor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorDto"];
                };
            };
        };
    };
    deleteActor: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getActorSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorSourceDto"];
                };
            };
        };
    };
    updateActorSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorSourceDto"];
                };
            };
        };
    };
    deleteActorSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getActorRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                roleCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorRoleDto"];
                };
            };
        };
    };
    updateActorRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                roleCode: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorRoleCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorRoleDto"];
                };
            };
        };
    };
    deleteActorRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                roleCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    reindexActors: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getWorkflows: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
                approved?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedWorkflows"];
                };
            };
        };
    };
    createWorkflow: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    createStep: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StepCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    createSubstep: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StepCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    mergeStep: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StepCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    publishWorkflow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    mergeWorkflow: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    getVocabularies: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedVocabularies"];
                };
            };
        };
    };
    createVocabulary: {
        parameters: {
            query?: {
                closed?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    ttl: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VocabularyBasicDto"];
                };
            };
        };
    };
    createConcept: {
        parameters: {
            query?: {
                candidate?: boolean;
            };
            header?: never;
            path: {
                "vocabulary-code": string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConceptCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConceptDto"];
                };
            };
        };
    };
    mergeConcepts: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                "vocabulary-code": string;
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "*/*": components["schemas"]["ConceptDto"];
                };
            };
        };
    };
    getUsers: {
        parameters: {
            query?: {
                order?: "username" | "date";
                q?: string;
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedUsers"];
                };
            };
        };
    };
    createUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    getTrainingMaterials: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
                approved?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedTrainingMaterials"];
                };
            };
        };
    };
    createTrainingMaterial: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TrainingMaterialCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    publishTrainingMaterial: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    mergeTrainingMaterial: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TrainingMaterialCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    getTools: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
                approved?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedTools"];
                };
            };
        };
    };
    createTool: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToolCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    publishTool: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    mergeTool: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToolCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    getSources: {
        parameters: {
            query?: {
                order?: "name" | "date";
                q?: string;
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSources"];
                };
            };
        };
    };
    createSource: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"];
                };
            };
        };
    };
    getPublications: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
                approved?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPublications"];
                };
            };
        };
    };
    createPublication: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    publishPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    mergePublication: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    getPropertyTypes: {
        parameters: {
            query?: {
                q?: string;
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPropertyTypes"];
                };
            };
        };
    };
    createPropertyType: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PropertyTypeCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PropertyTypeDto"];
                };
            };
        };
    };
    reorderPropertyTypes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PropertyTypesReordering"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    importMedia: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MediaLocation"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaDetails"];
                };
            };
        };
    };
    uploadMedia: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaDetails"];
                };
            };
        };
    };
    completeMediaUpload: {
        parameters: {
            query?: {
                filename?: string;
            };
            header?: never;
            path: {
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaDetails"];
                };
            };
        };
    };
    uploadMediaChunk: {
        parameters: {
            query: {
                mediaId?: string;
                no: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    chunk: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaUploadInfo"];
                };
            };
        };
    };
    getAllMediaSources: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaSourceDto"][];
                };
            };
        };
    };
    createMediaSource: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MediaSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaSourceDto"];
                };
            };
        };
    };
    getComments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemCommentDto"][];
                };
            };
        };
    };
    createItemComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemCommentCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemCommentDto"];
                };
            };
        };
    };
    getItemRelations: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemRelation"];
                };
            };
        };
    };
    createItemRelation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemRelationCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemRelationDto"];
                };
            };
        };
    };
    createItemRelatedItem: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                subjectId: string;
                objectId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemRelationId"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemRelatedItemDto"];
                };
            };
        };
    };
    deleteItemRelatedItem: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path: {
                subjectId: string;
                objectId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAllItemSources: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemSourceDto"][];
                };
            };
        };
    };
    createItemSource: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemSourceDto"];
                };
            };
        };
    };
    getDatasets: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
                approved?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDatasets"];
                };
            };
        };
    };
    createDataset: {
        parameters: {
            query?: {
                draft?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DatasetCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    publishDataset: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    mergeDataset: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DatasetCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    signIn: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginData"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getActors: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedActors"];
                };
            };
        };
    };
    createActor: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorDto"];
                };
            };
        };
    };
    mergeActor: {
        parameters: {
            query: {
                with: number[];
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorDto"];
                };
            };
        };
    };
    getAllActorSources: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorSourceDto"][];
                };
            };
        };
    };
    createActorSource: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorSourceCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorSourceDto"];
                };
            };
        };
    };
    getAllActorRoles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorRoleDto"][];
                };
            };
        };
    };
    createActorRole: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActorRoleCore"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorRoleDto"];
                };
            };
        };
    };
    oauth2: {
        parameters: {
            query: {
                "success-redirect-url": string;
                "failure-redirect-url": string;
                "registration-redirect-url": string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getWorkflowVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    deleteWorkflowVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getWorkflowVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getVersionedWorkflowAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getVersionedStepAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getStepVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
                stepVersionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    deleteStepVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
                stepVersionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getStepVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
                stepVersionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getStepSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getStepMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StepDto"];
                };
            };
        };
    };
    getStepInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getStepHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getStepAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                stepPersistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getWorkflowSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getWorkflowMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowDto"];
                };
            };
        };
    };
    getWorkflowInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getWorkflowHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getWorkflowAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    exportVocabulary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/turtle;charset=UTF-8": components["schemas"]["StreamingResponseBody"];
                };
            };
        };
    };
    getUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    getTrainingMaterialVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    deleteTrainingMaterialVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getTrainingMaterialVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getVersionedTrainingMaterialAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getTrainingMaterialSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getTrainingMaterialMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingMaterialDto"];
                };
            };
        };
    };
    getTrainingMaterialInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getTrainingMaterialHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getTrainingMaterialAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getToolVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    deleteToolVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getToolVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getVersionedToolAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getToolSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getToolMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ToolDto"];
                };
            };
        };
    };
    getToolInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getToolHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getToolAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getItemsForSource: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path: {
                sourceId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemsBasicItemBasicDto"];
                };
            };
        };
    };
    getItemsForSourceAndSourceItemId: {
        parameters: {
            query?: {
                page?: number;
                perpage?: number;
            };
            header?: never;
            path: {
                sourceId: number;
                sourceItemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemsBasicItemBasicDto"];
                };
            };
        };
    };
    getPublicationVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    deletePublicationVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublicationVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getVersionedPublicationAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getPublicationSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getPublicationMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDto"];
                };
            };
        };
    };
    getPublicationInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getPublicationHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getPublicationAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getMediaThumbnail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
        };
    };
    getMediaInfo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaDetails"];
                };
            };
        };
    };
    getMediaFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
        };
    };
    getLastComments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemCommentDto"][];
                };
            };
        };
    };
    getItemCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    searchItems: {
        parameters: {
            query?: {
                q?: string;
                categories?: ("tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step")[];
                order?: ("score" | "label" | "modified-on")[];
                page?: number;
                perpage?: number;
                advanced?: boolean;
                includeSteps?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSearchItems"];
                };
            };
        };
    };
    autocompleteItems: {
        parameters: {
            query: {
                q: string;
                category?: "tool-or-service" | "training-material" | "publication" | "dataset" | "workflow" | "step";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuggestedSearchPhrases"];
                };
            };
        };
    };
    getMyDraftItems: {
        parameters: {
            query?: {
                order?: "label" | "modified-on";
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemsBasicItemBasicDto"];
                };
            };
        };
    };
    getDeletedItems: {
        parameters: {
            query?: {
                order?: "label" | "modified-on";
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemsBasicItemBasicDto"];
                };
            };
        };
    };
    getDatasetVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    deleteDatasetVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getDatasetVersionInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getVersionedDatasetAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
                versionId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getDatasetSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceDto"][];
                };
            };
        };
    };
    getDatasetMerge: {
        parameters: {
            query: {
                with: string[];
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetDto"];
                };
            };
        };
    };
    getDatasetInformationContributors: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"][];
                };
            };
        };
    };
    getDatasetHistory: {
        parameters: {
            query?: {
                draft?: boolean;
                approved?: boolean;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemExtBasicDto"][];
                };
            };
        };
    };
    getDatasetAndVersionedItemDifferences: {
        parameters: {
            query: {
                with: string;
                otherVersionId?: number;
            };
            header?: never;
            path: {
                persistentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemsDifferencesDtoItemDtoItemDto"];
                };
            };
        };
    };
    getContributedItems: {
        parameters: {
            query?: {
                order?: "label" | "modified-on";
                page?: number;
                perpage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedItemsBasicItemExtBasicDto"];
                };
            };
        };
    };
    searchConcepts: {
        parameters: {
            query?: {
                q?: string;
                types?: string[];
                page?: number;
                perpage?: number;
                advanced?: boolean;
                order?: "score" | "label";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSearchConcepts"];
                };
            };
        };
    };
    getAllConceptRelations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConceptRelationDto"][];
                };
            };
        };
    };
    getLoggedInUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    getActorHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActorHistoryDto"][];
                };
            };
        };
    };
    searchActors: {
        parameters: {
            query?: {
                q?: string;
                page?: number;
                perpage?: number;
                advanced?: boolean;
                order?: "score" | "name";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSearchActor"];
                };
            };
        };
    };
    handle: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_3: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_2: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_5: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_6: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_1: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
    handle_4: {
        parameters: {
            query: {
                allRequestParams: components["schemas"]["MultiValueMapStringString"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
        };
    };
}
