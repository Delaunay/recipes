import traceback
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
    @app.route("/articles", methods=["GET"])
    def get_articles() -> Dict[str, Any]:
        try:
            articles = db.session.query(Article).filter(Article.parent.is_(None)).all()
            return jsonify([article.to_json() for article in articles])
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/articles/last-accessed", methods=["GET"])
    def latest_accessed_articles() -> Dict[str, Any]:
        return get_articles()

    # Get a single article with all its blocks in tree structure
    @app.route("/articles/<int:article_id>", methods=["GET"])
    def get_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Get article with full block tree
            article_json = article.to_json(session=db.session, children=True)

            # Fetch all blocks for this article
            articles = [article_json]
            Article.get_block_forest(db.session, articles)

            article_json["children"] = Article.get_article_forest(db.session, article)

            return jsonify(article_json)
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/article/search/<string:name>", methods=["GET"])
    def search_article(name: str):
        try:
            articles = (
                db.session.query(Article).filter(Article.title.ilike(f"%{name}%")).all()
            )
            return jsonify([article.to_json() for article in articles])
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/article/move/<int:article_id>/<int:new_parent>", methods=["POST"])
    def move_page(article_id, new_parent):
        article = db.session.query(Article).get(article_id)
        parent = db.session.query(Article).get(new_parent)

        if not article or not parent:
            return jsonify({"error": "Article or parent not found"}), 404

        root_id = parent.root_id if parent.root_id is not None else parent._id

        # Update the parent ID
        article.parent = parent._id
        article.root_id = root_id

        # Update the ROOT ID of all the children
        #   This is expensive because we need to do recursive calls
        queue = list(
            db.session.query(Article).filter(Article.parent == article._id).all()
        )
        while len(queue) > 0:
            child = queue.pop()
            child.root_id = root_id
            queue.extend(
                db.session.query(Article).filter(Article.parent == child._id).all()
            )

        db.session.commit()
        return jsonify(article.to_json())

    # Create a new article
    @app.route("/articles", methods=["POST"])
    def create_article() -> Dict[str, Any]:
        try:
            data = request.get_json()

            parent_id = data.get("parent_id")
            root_id = data.get("root_id")

            # If parent is specified, automatically set root_id
            if parent_id and not root_id:
                parent_article = db.session.query(Article).get(parent_id)
                if parent_article:
                    # If parent has a root, use that; otherwise parent is the root
                    root_id = (
                        parent_article.root_id if parent_article.root_id else parent_id
                    )

            article = Article(
                title=data.get("title", "Untitled"),
                namespace=data.get("namespace"),
                tags=data.get("tags", []),
                extension=data.get("extension", {}),
                parent=parent_id,
                root_id=root_id,
            )

            db.session.add(article)
            db.session.commit()

            return jsonify(article.to_json()), 201
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Create a child article for a given parent article
    @app.route("/articles/<int:parent_id>/children", methods=["POST"])
    def create_child_article(parent_id: int) -> Dict[str, Any]:
        try:
            parent_article = db.session.query(Article).get(parent_id)
            if not parent_article:
                return jsonify({"error": "Parent article not found"}), 404

            data = request.get_json()

            # Determine root_id: if parent has a root, use that; otherwise parent is the root
            root_id = parent_article.root_id if parent_article.root_id else parent_id

            article = Article(
                title=data.get("title", "Untitled Child"),
                namespace=data.get("namespace"),
                tags=data.get("tags", []),
                extension=data.get("extension", {}),
                parent=parent_id,
                root_id=root_id,
            )

            db.session.add(article)
            db.session.commit()

            return jsonify(article.to_json()), 201
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Get all child articles for a given parent
    @app.route("/articles/<int:parent_id>/children", methods=["GET"])
    def get_child_articles(parent_id: int) -> Dict[str, Any]:
        try:
            parent_article = db.session.query(Article).get(parent_id)
            if not parent_article:
                return jsonify({"error": "Parent article not found"}), 404

            child_articles = (
                db.session.query(Article).filter(Article.parent == parent_id).all()
            )
            return jsonify([child.to_json() for child in child_articles])
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    # Update article metadata (title, namespace, tags, extension)
    @app.route("/articles/<int:article_id>", methods=["PUT"])
    def update_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            data = request.get_json()

            if "title" in data:
                article.title = data["title"]
            if "namespace" in data:
                article.namespace = data["namespace"]
            if "tags" in data:
                article.tags = data["tags"]
            if "extension" in data:
                article.extension = data["extension"]

            db.session.commit()

            return jsonify(article.to_json())
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Delete an article and all its blocks
    @app.route("/articles/<int:article_id>", methods=["DELETE"])
    def delete_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Delete all blocks associated with this article
            db.session.query(ArticleBlock).filter(
                ArticleBlock.page_id == article_id
            ).delete()

            # Delete the article
            db.session.delete(article)
            db.session.commit()

            return jsonify({"message": "Article deleted successfully"})
        except Exception as e:
            print_exc()
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/blocks/insert", methods=["PUT"])
    def insert_blocks(insert, parent=None, page_id=None, depth=0):
        if parent is None:
            parent = insert["parent"]

        if page_id is None:
            page_id = insert["page_id"]

        # Insert Into a BLOCK
        # Insert INTo an ARTICLE
        blocks = []
        for child in insert.get("children", []):
            block = ArticleBlock(
                page_id=page_id,
                parent=parent,
                kind=child["kind"],
                data=child.get("data", {}),
                extension=child.get("extension", {}),
                sequence=child.get("sequence"),
            )

            db.session.add(block)
            db.session.flush()  # Flush to get the ID

            ids: list[dict] = []
            if "children" in child:
                result = insert_blocks(
                    child, parent=block._id, page_id=page_id, depth=depth + 1
                )
                ids.extend(result["children"])

            blocks.append({"id": block._id, "children": ids, "page_id": page_id})

        if depth == 0:
            db.session.commit()

        return {"action": "insert", "children": blocks}

    @app.route("/blocks/update", methods=["PUT"])
    def update_blocks(update, depth=0):
        block = db.session.query(ArticleBlock).get(update["id"])
        children = update["block_def"].pop("children", [])

        for item, value in update["block_def"].items():
            setattr(block, item, value)

        # for child in children:
        #     update_blocks(child, depth=depth + 1)

        if depth == 0:
            db.session.commit()

        return {"action": "update", "id": block._id}

    @app.route("/blocks/reorder", methods=["PUT"])
    def reorder_blocks(reorder, depth=0):
        block = db.session.query(ArticleBlock).get(reorder["id"])

        block.sequence = reorder["sequence"]

        if depth == 0:
            db.session.commit()

        return {"action": "reorder", "id": block._id}

    @app.route("/blocks/delete", methods=["PUT"])
    def delete_blocks(delete, depth=0):

        if hasattr(delete, "_id"):
            block_id = delete._id
        else:
            block_id = delete["block_id"]

        child_blocks = (
            db.session.query(ArticleBlock).filter(ArticleBlock.parent == block_id).all()
        )

        children_id = []
        for child in child_blocks:
            children_id.append(delete_blocks(child))

        block = db.session.query(ArticleBlock).get(block_id)
        db.session.delete(block)

        if depth == 0:
            db.session.commit()

        return {"action": "delete", "id": block._id, "children": children_id}

    @app.route("/blocks/batch", methods=["PUT"])
    def update_blocks_batch() -> Dict[str, Any]:
        # This returns message with the id of the modifed or created blocks
        # we can reconcile the reply with the front end to update the id
        try:
            actions = request.get_json()
            results = []

            for action in actions:
                match action["op"]:
                    case "insert":
                        results.append(insert_blocks(action, depth=1))
                    case "update":
                        results.append(update_blocks(action, depth=1))
                    case "reorder":
                        results.append(reorder_blocks(action, depth=1))
                    case "delete":
                        results.append(delete_blocks(action, depth=1))

            db.session.commit()
            return results
        except:
            traceback.print_exc()
            return {}

    # Export article to JSON (for downloading)
    @app.route("/articles/<int:article_id>/export", methods=["GET"])
    def export_article(article_id: int) -> Dict[str, Any]:
        try:
            article = db.session.query(Article).get(article_id)
            if not article:
                return jsonify({"error": "Article not found"}), 404

            # Get article with full block tree
            article_json = article.to_json(session=db.session, children=True)
            articles = [article_json]
            Article.get_block_forest(db.session, articles)

            return jsonify(article_json)
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500
