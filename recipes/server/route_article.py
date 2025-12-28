
from typing import Dict, Any
from datetime import datetime
from traceback import print_exc

from flask import jsonify, request

from .models.article import Article, ArticleBlock


def article_routes(app, db):
    """
    Article routes for managing blog posts/articles with nested blocks.
    Supports batch updates to minimize frontend requests.
    """

    # Get all articles (metadata only)
    @app.route('/articles', methods=['GET'])
    def get_articles() -> Dict[str, Any]:
        try:
            articles = db.session.query(Article).filter(Article.parent.is_(None)).all()
            return jsonify([article.to_json() for article in articles])
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500


    @app.route('/articles/last-accessed', methods=['GET'])
    def latest_accessed_articles() -> Dict[str, Any]:
        return get_articles()

    # Get a single article with all its blocks in tree structure
    @app.route('/articles/<int:article_id>', methods=['GET'])
    def get_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Get article with full block tree
            article_json = article.to_json(session=db.session, children=True)

            # Fetch all blocks for this article
            articles = [article_json]
            Article.get_article_forest(db.session, articles)

            # Get child articles (articles that have this article as parent)
            child_articles = db.session.query(Article).filter(Article.parent == article_id).all()
            article_json['child_articles'] = [child.to_json() for child in child_articles]

            return jsonify(article_json)
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    # Create a new article
    @app.route('/articles', methods=['POST'])
    def create_article() -> Dict[str, Any]:
        try:
            data = request.get_json()

            parent_id = data.get('parent_id')
            root_id = data.get('root_id')

            # If parent is specified, automatically set root_id
            if parent_id and not root_id:
                parent_article = db.session.query(Article).get(parent_id)
                if parent_article:
                    # If parent has a root, use that; otherwise parent is the root
                    root_id = parent_article.root_id if parent_article.root_id else parent_id

            article = Article(
                title=data.get('title', 'Untitled'),
                namespace=data.get('namespace'),
                tags=data.get('tags', []),
                extension=data.get('extension', {}),
                parent=parent_id,
                root_id=root_id
            )

            db.session.add(article)
            db.session.commit()

            return jsonify(article.to_json()), 201
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Create a child article for a given parent article
    @app.route('/articles/<int:parent_id>/children', methods=['POST'])
    def create_child_article(parent_id: int) -> Dict[str, Any]:
        try:
            parent_article = db.session.query(Article).get(parent_id)
            if not parent_article:
                return jsonify({"error": "Parent article not found"}), 404

            data = request.get_json()

            # Determine root_id: if parent has a root, use that; otherwise parent is the root
            root_id = parent_article.root_id if parent_article.root_id else parent_id

            article = Article(
                title=data.get('title', 'Untitled Child'),
                namespace=data.get('namespace'),
                tags=data.get('tags', []),
                extension=data.get('extension', {}),
                parent=parent_id,
                root_id=root_id
            )

            db.session.add(article)
            db.session.commit()

            return jsonify(article.to_json()), 201
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Get all child articles for a given parent
    @app.route('/articles/<int:parent_id>/children', methods=['GET'])
    def get_child_articles(parent_id: int) -> Dict[str, Any]:
        try:
            parent_article = db.session.query(Article).get(parent_id)
            if not parent_article:
                return jsonify({"error": "Parent article not found"}), 404

            child_articles = db.session.query(Article).filter(Article.parent == parent_id).all()
            return jsonify([child.to_json() for child in child_articles])
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    # Update article metadata (title, namespace, tags, extension)
    @app.route('/articles/<int:article_id>', methods=['PUT'])
    def update_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            data = request.get_json()

            if 'title' in data:
                article.title = data['title']
            if 'namespace' in data:
                article.namespace = data['namespace']
            if 'tags' in data:
                article.tags = data['tags']
            if 'extension' in data:
                article.extension = data['extension']

            db.session.commit()

            return jsonify(article.to_json())
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Delete an article and all its blocks
    @app.route('/articles/<int:article_id>', methods=['DELETE'])
    def delete_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Delete all blocks associated with this article
            db.session.query(ArticleBlock).filter(ArticleBlock.page_id == article_id).delete()

            # Delete the article
            db.session.delete(article)
            db.session.commit()

            return jsonify({"message": "Article deleted successfully"})
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Create a new block
    @app.route('/articles/<int:article_id>/blocks', methods=['POST'])
    def create_block(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            data = request.get_json()

            block = ArticleBlock(
                page_id=article_id,
                parent=data.get('parent_id'),
                kind=data.get('kind', 'text'),
                data=data.get('data', {}),
                extension=data.get('extension', {})
            )

            db.session.add(block)
            db.session.commit()

            return jsonify(block.to_json()), 201
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Batch update blocks (minimizes requests from frontend)
    # This is the key route for efficient updates - frontend can group
    # all changes over a 5-second period and send them in one request
    @app.route('/blocks/batch', methods=['PUT'])
    def update_blocks_batch() -> Dict[str, Any]:
        """
        Batch update multiple blocks at once using action-based format.
        Request body should be a list of actions:
        [
            {"op": "delete", "block_id": 1, "index": 0},
            {"op": "update", "block_id": 2, "block_def": {"kind": "text", "data": {...}}},
            {"op": "reorder", "block_id": 3, "sequence": 1.5},
            {"op": "insert", "parent": 10, "children": [{"kind": "text", "data": {...}}]},
            ...
        ]
        """
        try:
            actions = request.get_json()

            if not isinstance(actions, list):
                return jsonify({"error": "Request body must be a list of actions"}), 400

            updated_blocks = []
            created_blocks = []
            deleted_count = 0

            for action in actions:
                op = action.get('op')

                if op == 'delete':
                    block_id = action.get('block_id')
                    if not block_id:
                        continue

                    block = db.session.query(ArticleBlock).get(block_id)
                    if block:
                        db.session.delete(block)
                        deleted_count += 1

                elif op == 'update':
                    block_id = action.get('block_id')
                    if not block_id:
                        continue

                    block = db.session.query(ArticleBlock).get(block_id)
                    if not block:
                        continue

                    block_def = action.get('block_def', {})

                    # Update fields if provided
                    if 'kind' in block_def:
                        block.kind = block_def['kind']
                    if 'data' in block_def:
                        block.data = block_def['data']
                    if 'extension' in block_def:
                        block.extension = block_def['extension']
                    if 'parent' in block_def:
                        block.parent = block_def['parent']
                    if 'sequence' in block_def:
                        block.sequence = block_def['sequence']

                    updated_blocks.append(block.to_json())

                elif op == 'reorder':
                    block_id = action.get('block_id')
                    sequence = action.get('sequence')
                    if not block_id or sequence is None:
                        continue

                    block = db.session.query(ArticleBlock).get(block_id)
                    if block:
                        block.sequence = sequence
                        updated_blocks.append(block.to_json())

                elif op == 'insert':
                    parent_id = action.get('parent')
                    children = action.get('children', [])
                    if not parent_id or not children:
                        continue

                    # Get the parent article to determine page_id
                    # If parent is an article ID, use it as page_id
                    # If parent is a block ID, get its page_id
                    parent_block = db.session.query(ArticleBlock).get(parent_id)
                    if parent_block:
                        page_id = parent_block.page_id
                    else:
                        # Parent might be an article ID
                        parent_article = db.session.query(Article).get(parent_id)
                        if not parent_article:
                            continue
                        page_id = parent_id

                    # Create new blocks
                    for child_def in children:
                        new_block = ArticleBlock(
                            page_id=page_id,
                            parent=parent_id,
                            kind=child_def.get('kind', 'text'),
                            data=child_def.get('data', {}),
                            extension=child_def.get('extension', {}),
                            sequence=child_def.get('sequence')
                        )
                        db.session.add(new_block)
                        db.session.flush()  # Flush to get the ID
                        created_blocks.append(new_block.to_json())

            db.session.commit()

            return jsonify({
                "message": f"Processed {len(actions)} actions: {len(updated_blocks)} updated, {len(created_blocks)} created, {deleted_count} deleted",
                "blocks": updated_blocks + created_blocks
            })
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Update a single block
    @app.route('/blocks/<int:block_id>', methods=['PUT'])
    def update_block(block_id: int) -> Dict[str, Any]:
        try:
            block = db.session.query(ArticleBlock).get(block_id)
            if not block:
                return jsonify({"error": "Block not found"}), 404

            data = request.get_json()

            if 'kind' in data:
                block.kind = data['kind']
            if 'data' in data:
                block.data = data['data']
            if 'extension' in data:
                block.extension = data['extension']
            if 'parent' in data:
                block.parent = data['parent']

            db.session.commit()

            return jsonify(block.to_json())
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Delete a block
    @app.route('/blocks/<int:block_id>', methods=['DELETE'])
    def delete_block(block_id: int) -> Dict[str, Any]:
        try:
            block = db.session.query(ArticleBlock).get(block_id)
            if not block:
                return jsonify({"error": "Block not found"}), 404

            db.session.delete(block)
            db.session.commit()

            return jsonify({"message": "Block deleted successfully"})
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Export article to JSON (for downloading)
    @app.route('/articles/<int:article_id>/export', methods=['GET'])
    def export_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Get article with full block tree
            article_json = article.to_json(session=db.session, children=True)
            articles = [article_json]
            Article.get_article_forest(db.session, articles)

            return jsonify(article_json)
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500