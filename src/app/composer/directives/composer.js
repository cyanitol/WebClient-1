angular.module('proton.composer')
    .directive('composer', (AppModel, $rootScope, embedded, attachmentFileFormat) => {

        const CLASS_DRAGGABLE = 'composer-draggable';
        const CLASS_DRAGGABLE_EDITOR = 'composer-draggable-editor';

        const addDragenterClassName = (el, className = CLASS_DRAGGABLE) => el.classList.add(className);
        const addDragleaveClassName = (el) => {
            el.classList.remove(CLASS_DRAGGABLE);
            el.classList.remove(CLASS_DRAGGABLE_EDITOR);
        };

        const isMessage = ({ ID }, { message = {}, messageID }) => {
            return ID === messageID || ID === message.ID;
        };

        /**
         * Parse actions for the message and trigger some actions
         * @param  {$scope} scope
         * @param  {Node} el)
         * @return {Function}       (<event>, <data:Object>) callback from $rootScope
         */
        const onAction = (scope, el) => (e, { type, data }) => {

            if (!isMessage(scope.message, data)) {
                return;
            }

            switch (type) {
                case 'dragenter':
                    if (attachmentFileFormat.isUploadAbleType(data.event)) {
                        addDragenterClassName(el);
                    }
                    break;
                case 'drop':
                    // Same event as the one coming from squire
                    if (e.name === 'attachment.upload' && data.queue.files.length && data.queue.hasEmbedded) {
                        return addDragenterClassName(el, CLASS_DRAGGABLE_EDITOR);
                    }
                    addDragleaveClassName(el);
                    break;
                case 'upload':
                    addDragleaveClassName(el);
                    break;
                case 'upload.success':
                    _rAF(() => addDragleaveClassName(el));
                    break;
            }
        };


        return {
            replace: true,
            templateUrl: 'templates/directives/composer/composer.tpl.html',
            link(scope, el) {

                const onClick = ({ target }) => {

                    if (!/composerHeader-btn/.test(target.classList.toString())) {
                        $rootScope.$emit('composer.update', {
                            type: 'focus.click',
                            data: {
                                message: scope.message,
                                composer: el,
                                index: +el[0].getAttribute('data-index')
                            }
                        });
                    }

                    if (/squireToolbar/.test(target.classList.toString())) {
                        scope.$applyAsync(() => {
                            scope.message.ccbcc = false;
                        });
                    }

                };

                const onDragEnter = ({ originalEvent }) => {
                    if (attachmentFileFormat.isUploadAbleType(originalEvent)) {
                        addDragenterClassName(el[0]);
                    }
                };
                const onDragLeave = _.debounce(({ target }) => {
                    target.classList.contains('composer-dropzone') && addDragleaveClassName(el[0]);
                }, 16);

                el.on('dragenter', onDragEnter);
                el.on('dragleave', onDragLeave);
                el.on('click', onClick);

                const unsubscribeEditor = $rootScope.$on('editor.draggable', onAction(scope, el[0]));
                const unsubscribeAtt = $rootScope.$on('attachment.upload', onAction(scope, el[0]));

                scope
                    .$on('$destroy', () => {
                        el.off('dragenter', onDragEnter);
                        el.off('dragleave', onDragLeave);
                        el.off('click', onClick);

                        unsubscribeEditor();
                        unsubscribeAtt();

                        AppModel.set('activeComposer', false);
                        AppModel.set('maximizedComposer', false);
                        scope.selected = undefined;
                    });
            }
        };
    });

