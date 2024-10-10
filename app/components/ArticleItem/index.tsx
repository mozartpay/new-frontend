import React from 'react';
import { Link } from '@remix-run/react';
import { BlogTags, BlogAuthor } from '../../routes/blog';
import { motion } from 'framer-motion';

interface ArticleItemProps {
  link: string;
  imgSrc: string;
  imgAlt: string;
  tags: string[];
  title: string;
  description: string;
  authorName: string;
  date: Date;
}

const ArticleItem = ({ link, imgSrc, imgAlt, tags, title, description, authorName, date }: ArticleItemProps) => (
  <div className="article-item">
    <Link to={link}>
      <img src={imgSrc} alt={imgAlt} />
    </Link>
    <BlogTags tags={tags} marginTop={3} />
    <h3>{title}</h3>
    <p>{description}</p>
    <BlogAuthor name={authorName} date={date} />
  </div>
);

export default ArticleItem;